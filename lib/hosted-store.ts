import { toDateKey, isDateKey } from "./selectors";
import {
  createSupabaseAdapter,
  SupabaseAdapterError,
  type SupabaseHealthyAdapter,
} from "./supabase/adapter";
import type {
  HostedProgressPhoto,
  HostedReactionResult,
  HostedSession,
  ProfilePatch,
  ProgressPhotoInput as AdapterPhotoInput,
  WeightEntryInput as AdapterWeightInput,
} from "./supabase/types";
import {
  STORE_VERSION,
  type HostedState,
  type HostedStatus,
  type ProgressPhoto,
  type ReactionInput,
  type ReactionType,
  type RegisterInput,
  type Snapshot,
  type StoreListener,
  type User,
  type WeightEntry,
  type WeightUnit,
} from "./types";

const HOSTED_SESSION_KEY = "healthy-supabase-session-v1";
const USERNAME_PATTERN = /^[a-z0-9_.-]{3,32}$/;
const INTERNAL_EMAIL_DOMAIN = "accounts.healthy.invalid";
const MIN_WEIGHT_KG = 20;
const MAX_WEIGHT_KG = 400;

const EMPTY_SNAPSHOT: Snapshot = {
  version: STORE_VERSION,
  currentUser: null,
  currentUserId: null,
  users: [],
  weightEntries: [],
  progressPhotos: [],
  posts: [],
  reactions: [],
};

const SERVER_STATE: HostedState = {
  status: "booting",
  snapshot: EMPTY_SNAPSHOT,
  error: null,
};

export type { HostedState, HostedStatus } from "./types";
export type HostedProfilePatch = Omit<ProfilePatch, "username">;
export type HostedPhotoInput = Omit<AdapterPhotoInput, "date"> & {
  date?: string | Date;
};
export type HostedWeightInput = Omit<AdapterWeightInput, "date"> & {
  date: string | Date;
};

class HostedStoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HostedStoreError";
  }
}

let hostedState: HostedState = SERVER_STATE;
let adapter: SupabaseHealthyAdapter | null = null;
let initialization: Promise<void> | null = null;
const listeners = new Set<StoreListener>();

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function setHostedState(next: HostedState): void {
  hostedState = next;
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // A broken subscriber must not prevent other React roots from updating.
    }
  });
}

function setAnonymous(error: string | null = null): void {
  setHostedState({ status: "anonymous", snapshot: EMPTY_SNAPSHOT, error });
}

function sessionRecord(value: unknown): value is HostedSession {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<HostedSession>;
  return Boolean(
    typeof candidate.accessToken === "string" &&
      candidate.accessToken &&
      typeof candidate.refreshToken === "string" &&
      candidate.refreshToken &&
      candidate.user &&
      typeof candidate.user.id === "string" &&
      candidate.profile &&
      typeof candidate.profile.id === "string",
  );
}

function removeStoredSession(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(HOSTED_SESSION_KEY);
  } catch {
    // Clearing in-memory auth is still sufficient to log out this tab.
  }
}

function readStoredSession(): HostedSession | null {
  if (!isBrowser()) return null;
  try {
    const serialized = window.localStorage.getItem(HOSTED_SESSION_KEY);
    if (!serialized) return null;
    const parsed: unknown = JSON.parse(serialized);
    if (sessionRecord(parsed)) return parsed;
  } catch {
    // A malformed or inaccessible session is handled like an expired session.
  }
  removeStoredSession();
  return null;
}

function persistSession(session: HostedSession): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(HOSTED_SESSION_KEY, JSON.stringify(session));
  } catch {
    throw new HostedStoreError(
      "Healthy could not save your sign-in session in this browser.",
    );
  }
}

function isStatus(error: unknown, status: number): boolean {
  return (
    error instanceof SupabaseAdapterError
      ? error.status === status
      : Boolean(
          error &&
            typeof error === "object" &&
            "status" in error &&
            (error as { status?: unknown }).status === status,
        )
  );
}

function isRejectedSession(error: unknown): boolean {
  return isStatus(error, 400) || isStatus(error, 401);
}

function userMessage(error: unknown, fallback: string): string {
  if (error instanceof HostedStoreError) return error.message;

  if (error instanceof SupabaseAdapterError) {
    const message = error.message.toLowerCase();
    if (
      error.code?.startsWith("INVALID_") ||
      error.code === "PHOTO_TOO_LARGE" ||
      error.code === "AUTH_REQUIRED"
    ) {
      return error.message;
    }
    if (message.includes("invalid login credentials")) {
      return "The username or password is incorrect.";
    }
    if (
      error.status === 409 ||
      error.status === 422 ||
      message.includes("already registered") ||
      message.includes("already exists")
    ) {
      return "That username is already registered.";
    }
    if (error.status === 401) {
      return "Your session has expired. Please log in again.";
    }
    if (error.status === 403) {
      return "You do not have permission to complete that action.";
    }
    if (error.status === 429) {
      return "Too many requests. Please wait a moment and try again.";
    }
    if (error.status >= 500) {
      return "Healthy's cloud service is temporarily unavailable. Please try again.";
    }
  }

  if (error instanceof TypeError) {
    return "Healthy could not reach the cloud service. Check your connection and try again.";
  }
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

function recordFailure(error: unknown, fallback: string): HostedStoreError {
  const message = userMessage(error, fallback);
  const status: HostedStatus =
    hostedState.status === "booting" ? "error" : hostedState.status;
  setHostedState({ ...hostedState, status, error: message });
  return new HostedStoreError(message);
}

function normalizeUsername(value: string): string {
  const normalized = value.trim().normalize("NFKC").toLowerCase();
  if (!USERNAME_PATTERN.test(normalized)) {
    throw new HostedStoreError(
      "Username must contain 3–32 lowercase letters, numbers, dots, underscores, or hyphens.",
    );
  }
  return normalized;
}

function internalEmail(username: string): string {
  return `${normalizeUsername(username)}@${INTERNAL_EMAIL_DOMAIN}`;
}

function requiredWeight(value: unknown, label: string): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value.replace(",", "."))
        : Number.NaN;
  if (!Number.isFinite(parsed) || parsed < MIN_WEIGHT_KG || parsed > MAX_WEIGHT_KG) {
    throw new HostedStoreError(
      `${label} must be between ${MIN_WEIGHT_KG} and ${MAX_WEIGHT_KG} kg.`,
    );
  }
  return Math.round(parsed * 100) / 100;
}

function requiredDate(
  value: string | Date | undefined,
  fallbackToToday = false,
): string {
  if (value === undefined && fallbackToToday) return toDateKey(new Date());
  if (value instanceof Date && !Number.isNaN(value.getTime())) return toDateKey(value);
  if (typeof value === "string" && isDateKey(value.trim())) return value.trim();
  throw new HostedStoreError("Dates must use a valid YYYY-MM-DD value.");
}

function requireAdapter(): SupabaseHealthyAdapter {
  if (!adapter) {
    throw new HostedStoreError(
      "Healthy is not connected to Supabase. Add the public Supabase environment variables and redeploy.",
    );
  }
  return adapter;
}

function requireAuthenticatedAdapter(): SupabaseHealthyAdapter {
  const client = requireAdapter();
  if (!client.getSession()) {
    throw new HostedStoreError("Please log in to continue.");
  }
  return client;
}

function clearSession(): void {
  adapter?.setSession(null);
  removeStoredSession();
  setAnonymous();
}

async function renewSession(client: SupabaseHealthyAdapter): Promise<HostedSession> {
  const refreshToken = client.getSession()?.refreshToken;
  if (!refreshToken) {
    clearSession();
    throw new HostedStoreError("Your session has expired. Please log in again.");
  }

  try {
    const session = await client.refreshSession(refreshToken);
    persistSession(session);
    return session;
  } catch (error) {
    if (isRejectedSession(error)) {
      clearSession();
      throw new HostedStoreError("Your session has expired. Please log in again.");
    }
    throw error;
  }
}

async function refreshIfExpiring(client: SupabaseHealthyAdapter): Promise<void> {
  const expiresAt = client.getSession()?.expiresAt;
  if (
    typeof expiresAt === "number" &&
    expiresAt <= Math.floor(Date.now() / 1000) + 60
  ) {
    await renewSession(client);
  }
}

async function withAuthRetry<T>(
  client: SupabaseHealthyAdapter,
  operation: () => Promise<T>,
): Promise<T> {
  await refreshIfExpiring(client);
  try {
    return await operation();
  } catch (error) {
    if (!isStatus(error, 401)) throw error;
    await renewSession(client);
    try {
      return await operation();
    } catch (retryError) {
      if (isStatus(retryError, 401)) clearSession();
      throw retryError;
    }
  }
}

async function loadCanonicalData(client: SupabaseHealthyAdapter): Promise<Snapshot> {
  const [profile, weightEntries, progressPhotos, feed] = await Promise.all([
    client.getProfile(),
    client.listWeights(),
    client.listPhotos(),
    client.listFeed(),
  ]);

  const session = client.getSession();
  if (session) {
    const canonicalSession = { ...session, profile };
    client.setSession(canonicalSession);
    persistSession(canonicalSession);
  }

  return {
    version: STORE_VERSION,
    currentUser: profile,
    currentUserId: profile.id,
    users: [profile],
    weightEntries,
    progressPhotos,
    posts: feed.posts,
    reactions: feed.reactions,
  };
}

async function loadAndPublish(client: SupabaseHealthyAdapter): Promise<Snapshot> {
  const snapshot = await withAuthRetry(client, () => loadCanonicalData(client));
  setHostedState({ status: "ready", snapshot, error: null });
  return snapshot;
}

async function bootstrapHostedStore(): Promise<void> {
  const configured = createSupabaseAdapter();
  if (!configured) {
    setHostedState({
      status: "error",
      snapshot: EMPTY_SNAPSHOT,
      error:
        "Healthy is not connected to Supabase. Add the public Supabase environment variables and redeploy.",
    });
    return;
  }

  adapter = configured;
  const restored = readStoredSession();
  if (!restored) {
    setAnonymous();
    return;
  }

  adapter.setSession(restored);
  try {
    await renewSession(adapter);
    await loadAndPublish(adapter);
  } catch (error) {
    if (isRejectedSession(error)) {
      clearSession();
      return;
    }
    recordFailure(error, "Healthy could not restore your session.");
  }
}

function startInitialization(): Promise<void> {
  if (!isBrowser()) return Promise.resolve();
  if (!initialization) {
    // Deferring one microtask prevents an external-store update during render.
    initialization = Promise.resolve().then(bootstrapHostedStore);
  }
  return initialization;
}

async function readyForOperation(): Promise<SupabaseHealthyAdapter> {
  await startInitialization();
  return requireAdapter();
}

/** Subscribe to hosted auth/data changes. Suitable for useSyncExternalStore. */
export function subscribeHosted(listener: StoreListener): () => void {
  listeners.add(listener);
  void startInitialization();
  return () => listeners.delete(listener);
}

/** Read the stable browser state and lazily start session restoration. */
export function getHostedState(): HostedState {
  void startInitialization();
  return hostedState;
}

/** Stable state used during server rendering and the hydration pass. */
export function getHostedServerState(): HostedState {
  return SERVER_STATE;
}

export async function loginHosted(
  username: string,
  password: string,
): Promise<User> {
  try {
    const client = await readyForOperation();
    if (!password) throw new HostedStoreError("Enter your password.");
    const result = await client.signIn({ email: internalEmail(username), password });
    if (!result.session) {
      throw new HostedStoreError("Healthy could not start your session.");
    }
    persistSession(result.session);
    const snapshot = await loadAndPublish(client);
    return snapshot.currentUser!;
  } catch (error) {
    throw recordFailure(error, "Healthy could not log you in.");
  }
}

type RegistrationResponse = { ok?: boolean; error?: string };

async function createConfirmedAccount(body: Record<string, unknown>): Promise<void> {
  let response: Response;
  try {
    response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw new HostedStoreError(userMessage(error, "Registration could not be completed."));
  }

  let payload: RegistrationResponse = {};
  try {
    payload = (await response.json()) as RegistrationResponse;
  } catch {
    // A status-specific generic message is safer than exposing a raw response.
  }
  if (!response.ok) {
    throw new HostedStoreError(
      typeof payload.error === "string" && payload.error.trim()
        ? payload.error
        : response.status === 409
          ? "That username is already registered."
          : "Registration could not be completed. Please try again.",
    );
  }
}

export async function registerHosted(input: RegisterInput): Promise<User> {
  try {
    const client = await readyForOperation();
    const username = normalizeUsername(input.username);
    if (input.password.length < 8) {
      throw new HostedStoreError("Password must contain at least 8 characters.");
    }

    const startWeightKg = requiredWeight(
      input.startWeightKg ?? input.startWeight,
      "Starting weight",
    );
    const targetWeightKg = requiredWeight(
      input.goalWeightKg ?? input.goalWeight,
      "Goal weight",
    );
    if (targetWeightKg >= startWeightKg) {
      throw new HostedStoreError("Goal weight must be lower than starting weight.");
    }

    const startDate = requiredDate(input.startDate, true);
    const targetDate = input.targetDate
      ? requiredDate(input.targetDate)
      : undefined;
    const unit: WeightUnit = input.unit === "lb" ? "lb" : "kg";
    const displayName = (input.displayName?.trim() || username).slice(0, 50);

    await createConfirmedAccount({
      username,
      password: input.password,
      displayName,
      startWeightKg,
      targetWeightKg,
      startDate,
      targetDate,
      unit,
      feedOptIn: true,
    });

    const auth = await client.signIn({
      email: internalEmail(username),
      password: input.password,
    });
    if (!auth.session) {
      throw new HostedStoreError("Your account was created, but sign-in failed.");
    }
    persistSession(auth.session);

    await withAuthRetry(client, () =>
      client.upsertWeight({ date: startDate, weightKg: startWeightKg }),
    );
    const snapshot = await loadAndPublish(client);
    return snapshot.currentUser!;
  } catch (error) {
    throw recordFailure(error, "Healthy could not create your account.");
  }
}

export async function logoutHosted(): Promise<void> {
  await startInitialization();
  const client = adapter;
  try {
    await client?.signOut();
  } catch {
    // Removing the only local copy of the token still completes local logout.
  } finally {
    if (client) client.setSession(null);
    removeStoredSession();
    setAnonymous();
  }
}

export async function refreshHostedData(): Promise<Snapshot> {
  try {
    await readyForOperation();
    return await loadAndPublish(requireAuthenticatedAdapter());
  } catch (error) {
    throw recordFailure(error, "Healthy could not refresh your cloud data.");
  }
}

export async function addHostedWeight(
  input: HostedWeightInput,
): Promise<WeightEntry> {
  try {
    await readyForOperation();
    const client = requireAuthenticatedAdapter();
    const date = requiredDate(input.date);
    const weightKg = requiredWeight(input.weightKg, "Weight");
    const written = await withAuthRetry(client, () =>
      client.upsertWeight({ date, weightKg, note: input.note }),
    );
    const snapshot = await loadAndPublish(client);
    return (
      snapshot.weightEntries.find((entry) => entry.id === written.id) ??
      snapshot.weightEntries.find(
        (entry) => entry.userId === snapshot.currentUserId && entry.date === date,
      ) ??
      written
    );
  } catch (error) {
    throw recordFailure(error, "Healthy could not save that weight.");
  }
}

export async function addHostedPhoto(
  file: Blob,
  input: HostedPhotoInput,
  originalName?: string,
): Promise<ProgressPhoto> {
  try {
    await readyForOperation();
    const client = requireAuthenticatedAdapter();
    const date = requiredDate(input.date, true);
    const written = await withAuthRetry(client, () =>
      client.uploadProgressPhoto(
        file,
        {
          date,
          caption: input.caption,
          visibility: input.visibility,
        },
        originalName,
      ),
    );
    const snapshot = await loadAndPublish(client);
    return (
      snapshot.progressPhotos.find((photo) => photo.id === written.id) ?? written
    );
  } catch (error) {
    throw recordFailure(error, "Healthy could not upload that photo.");
  }
}

function reactionType(input: ReactionInput): ReactionType {
  return typeof input === "string" ? input : input.type;
}

export async function toggleHostedReaction(
  postId: string,
  input: ReactionInput,
): Promise<HostedReactionResult> {
  try {
    await readyForOperation();
    const client = requireAuthenticatedAdapter();
    const result = await withAuthRetry(client, () =>
      client.toggleReaction(postId, reactionType(input)),
    );
    await loadAndPublish(client);
    return result;
  } catch (error) {
    throw recordFailure(error, "Healthy could not save that reaction.");
  }
}

function immutableProfilePatch(patch: HostedProfilePatch): ProfilePatch {
  return {
    displayName: patch.displayName,
    startWeightKg: patch.startWeightKg,
    targetWeightKg: patch.targetWeightKg,
    startDate: patch.startDate,
    targetDate: patch.targetDate,
    unit: patch.unit,
    feedOptIn: patch.feedOptIn,
  };
}

export async function updateHostedProfile(
  patch: HostedProfilePatch,
): Promise<User> {
  try {
    await readyForOperation();
    const client = requireAuthenticatedAdapter();
    await withAuthRetry(client, () =>
      client.updateProfile(immutableProfilePatch(patch)),
    );
    const currentSession = client.getSession();
    if (currentSession) persistSession(currentSession);
    const snapshot = await loadAndPublish(client);
    return snapshot.currentUser!;
  } catch (error) {
    throw recordFailure(error, "Healthy could not update your profile.");
  }
}

// This type export lets upload consumers retain Storage-specific metadata when
// they need it without making the main Snapshot depend on adapter internals.
export type { HostedProgressPhoto };
