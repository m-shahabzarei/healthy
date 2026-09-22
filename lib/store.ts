import {
  createSeedSnapshot,
  DEMO_PASSWORD,
  DEMO_USER_ID,
  DEMO_USERNAME,
} from "./seed";
import {
  STORE_KEY,
  STORE_VERSION,
  type AuthResult,
  type CommunityPost,
  type Goal,
  type ProgressPhoto,
  type ProgressPhotoInput,
  type Reaction,
  type ReactionCounts,
  type ReactionInput,
  type ReactionToggleResult,
  type ReactionType,
  type RegisterInput,
  type Snapshot,
  type StoreListener,
  type User,
  type WeightEntry,
  type WeightEntryInput,
} from "./types";

// React needs a referentially stable server snapshot for useSyncExternalStore.
// Keep this independent from the browser-hydrated cache so the first SSR
// render is deterministic while the client can restore localStorage after
// hydration without producing a markup mismatch.
const SERVER_SNAPSHOT: Snapshot = createSeedSnapshot();

/** Public aliases kept here so importing code does not need to know the key. */
export { STORE_KEY, STORE_VERSION };

const MIN_WEIGHT_KG = 20;
const MAX_WEIGHT_KG = 400;
const MAX_USERNAME_LENGTH = 32;
const MAX_DISPLAY_NAME_LENGTH = 50;

let snapshotCache: Snapshot | null = null;
let hydratedFromBrowser = false;
let storageListenerInstalled = false;
const listeners = new Set<StoreListener>();

function isBrowser(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return typeof window.localStorage !== "undefined";
  } catch {
    return false;
  }
}

function clone<T>(value: T): T {
  // JSON is intentional here: the persisted domain contains only plain data,
  // and this also works in older browsers where structuredClone is absent.
  return JSON.parse(JSON.stringify(value)) as T;
}

function notify(): void {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // A subscriber must not prevent the store from notifying the others.
    }
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** Format a Date using the user's local calendar day, avoiding UTC off-by-one errors. */
export function toDateKey(value: string | Date | undefined | null): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;
    }
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function isDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00`);
  return !Number.isNaN(parsed.getTime()) && toDateKey(parsed) === value;
}

function makeId(prefix: string): string {
  const randomUuid =
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${randomUuid}`;
}

function normalizeUsername(value: string): string {
  return value.trim().normalize("NFKC").toLowerCase();
}

function initialsFor(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : parts[0][0]).toUpperCase();
}

function defaultGoal(startWeightKg = 0, targetWeightKg = 0, startDate = toDateKey(undefined)): Goal {
  return {
    startWeightKg,
    targetWeightKg,
    startWeight: startWeightKg,
    targetWeight: targetWeightKg,
    startDate,
    unit: "kg",
  };
}

function normalizeGoal(value: unknown): Goal {
  const raw = isRecord(value) ? value : {};
  const startWeightKg =
    asFiniteNumber(raw.startWeightKg) ?? asFiniteNumber(raw.startWeight) ?? 0;
  const targetWeightKg =
    asFiniteNumber(raw.targetWeightKg) ??
    asFiniteNumber(raw.targetWeight) ??
    asFiniteNumber(raw.goalWeightKg) ??
    asFiniteNumber(raw.goalWeight) ??
    0;
  const startDate =
    typeof raw.startDate === "string" && isDateKey(raw.startDate)
      ? raw.startDate
      : toDateKey(undefined);
  const targetDate =
    typeof raw.targetDate === "string" && isDateKey(raw.targetDate)
      ? raw.targetDate
      : undefined;
  const unit = raw.unit === "lb" ? "lb" : "kg";
  return {
    ...defaultGoal(startWeightKg, targetWeightKg, startDate),
    targetDate,
    unit,
    startWeight: startWeightKg,
    targetWeight: targetWeightKg,
  };
}

function normalizeUser(value: unknown): User | null {
  if (!isRecord(value)) return null;
  const id = typeof value.id === "string" && value.id ? value.id : makeId("user");
  const username =
    typeof value.username === "string" ? normalizeUsername(value.username) : "";
  if (!username) return null;
  const displayName =
    typeof value.displayName === "string" && value.displayName.trim()
      ? value.displayName.trim().slice(0, MAX_DISPLAY_NAME_LENGTH)
      : username;
  const createdAt =
    typeof value.createdAt === "string" && value.createdAt
      ? value.createdAt
      : new Date().toISOString();
  const user: User = {
    id,
    username,
    displayName,
    createdAt,
    goal: normalizeGoal(value.goal),
    startWeight:
      asFiniteNumber(value.startWeight) ?? asFiniteNumber(value.startWeightKg) ?? undefined,
    goalWeight:
      asFiniteNumber(value.goalWeight) ??
      asFiniteNumber(value.goalWeightKg) ??
      asFiniteNumber(value.targetWeight) ??
      asFiniteNumber(value.targetWeightKg) ??
      undefined,
    targetWeight:
      asFiniteNumber(value.targetWeight) ??
      asFiniteNumber(value.targetWeightKg) ??
      asFiniteNumber(value.goalWeight) ??
      asFiniteNumber(value.goalWeightKg) ??
      undefined,
    unit: value.unit === "lb" ? "lb" : "kg",
    avatarUrl: typeof value.avatarUrl === "string" ? value.avatarUrl : undefined,
    initials:
      typeof value.initials === "string" && value.initials
        ? value.initials
        : initialsFor(displayName),
    password: typeof value.password === "string" ? value.password : undefined,
    passwordHash: typeof value.passwordHash === "string" ? value.passwordHash : undefined,
    isDemo: value.isDemo === true,
  };
  user.startWeight ??= user.goal.startWeightKg;
  user.goalWeight ??= user.goal.targetWeightKg;
  user.targetWeight ??= user.goal.targetWeightKg;
  return user;
}

function normalizeWeight(value: unknown): WeightEntry | null {
  if (!isRecord(value)) return null;
  const weight = asFiniteNumber(value.weight) ?? asFiniteNumber(value.weightKg);
  if (weight === null || weight < MIN_WEIGHT_KG || weight > MAX_WEIGHT_KG) return null;
  const date = toDateKey(
    typeof value.date === "string" || value.date instanceof Date
      ? (value.date as string | Date)
      : undefined,
  );
  const userId = typeof value.userId === "string" ? value.userId : "";
  if (!userId || !isDateKey(date)) return null;
  return {
    id: typeof value.id === "string" && value.id ? value.id : makeId("weight"),
    userId,
    date,
    weight,
    weightKg: weight,
    value: weight,
    note: typeof value.note === "string" ? value.note.trim() : undefined,
    createdAt:
      typeof value.createdAt === "string" && value.createdAt
        ? value.createdAt
        : new Date().toISOString(),
  };
}

function normalizePhoto(value: unknown): ProgressPhoto | null {
  if (!isRecord(value)) return null;
  const source = [value.dataUrl, value.imageUrl, value.url, value.src].find(
    (item): item is string => typeof item === "string" && item.trim().length > 0,
  );
  if (!source) return null;
  const userId = typeof value.userId === "string" ? value.userId : "";
  if (!userId) return null;
  const date = toDateKey(
    typeof value.date === "string" || value.date instanceof Date
      ? (value.date as string | Date)
      : typeof value.takenAt === "string"
        ? value.takenAt
        : undefined,
  );
  return {
    id: typeof value.id === "string" && value.id ? value.id : makeId("photo"),
    userId,
    date,
    takenAt: date,
    dataUrl: source,
    imageUrl: source,
    url: source,
    src: source,
    caption: typeof value.caption === "string" ? value.caption.trim() : undefined,
    visibility: value.visibility === "feed" ? "feed" : "private",
    createdAt:
      typeof value.createdAt === "string" && value.createdAt
        ? value.createdAt
        : new Date().toISOString(),
  };
}

function normalizeCounts(value: unknown): ReactionCounts {
  const counts: ReactionCounts = {};
  if (!isRecord(value)) return counts;
  Object.entries(value).forEach(([key, count]) => {
    const number = asFiniteNumber(count);
    if (number !== null && number >= 0) counts[key] = Math.floor(number);
  });
  return counts;
}

function normalizePost(value: unknown): CommunityPost | null {
  if (!isRecord(value)) return null;
  const id = typeof value.id === "string" && value.id ? value.id : makeId("post");
  const body =
    (typeof value.body === "string" && value.body) ||
    (typeof value.copy === "string" && value.copy) ||
    (typeof value.text === "string" && value.text) ||
    "";
  if (!body) return null;
  const type =
    value.type === "weight_loss" ||
    value.type === "streak" ||
    value.type === "goal_milestone" ||
    value.type === "photo" ||
    value.type === "milestone"
      ? value.type
      : "custom";
  const date = toDateKey(typeof value.date === "string" ? value.date : undefined);
  return {
    id,
    userId: typeof value.userId === "string" ? value.userId : "",
    type,
    kind: type,
    date,
    createdAt:
      typeof value.createdAt === "string" && value.createdAt
        ? value.createdAt
        : new Date().toISOString(),
    body,
    copy: typeof value.copy === "string" ? value.copy : body,
    title: typeof value.title === "string" ? value.title : undefined,
    text: typeof value.text === "string" ? value.text : body,
    authorName: typeof value.authorName === "string" ? value.authorName : undefined,
    authorInitials:
      typeof value.authorInitials === "string" ? value.authorInitials : undefined,
    metricValue: asFiniteNumber(value.metricValue) ?? undefined,
    value: asFiniteNumber(value.value) ?? asFiniteNumber(value.metricValue) ?? undefined,
    metricLabel: typeof value.metricLabel === "string" ? value.metricLabel : undefined,
    activityKey: typeof value.activityKey === "string" ? value.activityKey : undefined,
    generated: value.generated === true,
    reactions: normalizeCounts(value.reactions),
  };
}

/**
 * Migrate the original Persian demo fixture without touching arbitrary user
 * content. The browser key is intentionally kept stable, so people who have
 * already opened the prototype see the English fixture after this release.
 */
function migrateLegacyDemoContent(
  users: User[],
  weightEntries: WeightEntry[],
  progressPhotos: ProgressPhoto[],
  posts: CommunityPost[],
): {
  users: User[];
  weightEntries: WeightEntry[];
  progressPhotos: ProgressPhoto[];
  posts: CommunityPost[];
} {
  const seed = createSeedSnapshot();
  const seedUser = seed.users.find((user) => user.id === DEMO_USER_ID);
  if (!seedUser || !users.some((user) => user.id === DEMO_USER_ID)) {
    return { users, weightEntries, progressPhotos, posts };
  }
  const seedWeights = new Map(seed.weightEntries.map((entry) => [entry.id, entry]));
  const seedPhotos = new Map(seed.progressPhotos.map((photo) => [photo.id, photo]));
  const seedPosts = new Map(seed.posts.map((post) => [post.id, post]));
  return {
    users: users.map((user) =>
      user.id === DEMO_USER_ID
        ? { ...user, displayName: seedUser.displayName, initials: seedUser.initials }
        : user,
    ),
    weightEntries: weightEntries.map((entry) => {
      const canonical = seedWeights.get(entry.id);
      return canonical && entry.userId === DEMO_USER_ID
        ? { ...entry, note: canonical.note }
        : entry;
    }),
    progressPhotos: progressPhotos.map((photo) => {
      const canonical = seedPhotos.get(photo.id);
      return canonical && photo.userId === DEMO_USER_ID
        ? { ...photo, caption: canonical.caption }
        : photo;
    }),
    posts: posts.map((post) => {
      const canonical = seedPosts.get(post.id);
      return canonical && post.userId === DEMO_USER_ID
        ? {
            ...post,
            body: canonical.body,
            copy: canonical.copy,
            text: canonical.text,
            title: canonical.title,
            authorName: canonical.authorName,
            authorInitials: canonical.authorInitials,
            metricLabel: canonical.metricLabel,
          }
        : post;
    }),
  };
}

function normalizeReaction(value: unknown): Reaction | null {
  if (!isRecord(value)) return null;
  const type = normalizeReactionType(value.type);
  if (!type || typeof value.postId !== "string" || typeof value.userId !== "string") {
    return null;
  }
  return {
    id: typeof value.id === "string" && value.id ? value.id : makeId("reaction"),
    postId: value.postId,
    userId: value.userId,
    type,
    createdAt:
      typeof value.createdAt === "string" && value.createdAt
        ? value.createdAt
        : new Date().toISOString(),
  };
}

function normalizeReactionType(value: unknown): ReactionType | null {
  if (
    value === "encourage" ||
    value === "celebrate" ||
    value === "fire" ||
    value === "cheer" ||
    value === "strong" ||
    value === "support" ||
    value === "heart" ||
    value === "like"
  ) {
    return value;
  }
  // A few UI labels commonly used by early prototypes.
  return null;
}

function normalizeSnapshot(value: unknown): Snapshot {
  const seed = createSeedSnapshot();
  let raw: Record<string, unknown> = isRecord(value) ? value : {};

  // Early experiments sometimes wrapped the snapshot in `data`; accepting it
  // here makes the versioned key resilient to that harmless shape change.
  if (isRecord(raw.data)) raw = raw.data;

  const usersFromStorage = Array.isArray(raw.users)
    ? raw.users.map(normalizeUser).filter((user): user is User => Boolean(user))
    : seed.users;
  let users = usersFromStorage.length ? usersFromStorage : seed.users;
  const userIds = new Set(users.map((user) => user.id));

  const weightSource = Array.isArray(raw.weightEntries)
    ? raw.weightEntries
    : seed.weightEntries;
  let weightEntries = weightSource
    .map(normalizeWeight)
    .filter((entry): entry is WeightEntry => Boolean(entry))
    .filter((entry) => userIds.has(entry.userId));

  const photoSource = Array.isArray(raw.progressPhotos)
    ? raw.progressPhotos
    : seed.progressPhotos;
  let progressPhotos = photoSource
    .map(normalizePhoto)
    .filter((photo): photo is ProgressPhoto => Boolean(photo))
    .filter((photo) => userIds.has(photo.userId));

  const postSource = Array.isArray(raw.posts) ? raw.posts : seed.posts;
  let posts = postSource
    .map(normalizePost)
    .filter((post): post is CommunityPost => Boolean(post));

  const reactionSource = Array.isArray(raw.reactions) ? raw.reactions : [];
  const reactions = reactionSource
    .map(normalizeReaction)
    .filter((reaction): reaction is Reaction => Boolean(reaction))
    .filter((reaction) => userIds.has(reaction.userId));

  const migrated = migrateLegacyDemoContent(users, weightEntries, progressPhotos, posts);
  users = migrated.users;
  weightEntries = migrated.weightEntries;
  progressPhotos = migrated.progressPhotos;
  posts = migrated.posts;

  // Keep one entry per user/day. The last stored item wins, which is the same
  // behavior as addWeightEntry's edit-friendly upsert.
  const weightByDay = new Map<string, WeightEntry>();
  weightEntries.forEach((entry) => weightByDay.set(`${entry.userId}:${entry.date}`, entry));

  const reactionByUserPost = new Map<string, Reaction>();
  reactions.forEach((reaction) =>
    reactionByUserPost.set(`${reaction.postId}:${reaction.userId}`, reaction),
  );

  const currentUserRaw = raw.currentUser;
  const currentUserId =
    isRecord(currentUserRaw) && typeof currentUserRaw.id === "string"
      ? currentUserRaw.id
      : typeof currentUserRaw === "string"
        ? currentUserRaw
        : null;
  const currentUser = currentUserId
    ? users.find((user) => user.id === currentUserId) ?? null
    : null;

  // If an older snapshot has no `currentUser` field but contains the demo
  // user's id in a session field, recover it without changing the public shape.
  const recoveredCurrentUser =
    currentUser ??
    (typeof raw.currentUserId === "string"
      ? users.find((user) => user.id === raw.currentUserId) ?? null
      : null);

  return {
    version: STORE_VERSION,
    currentUser: recoveredCurrentUser ? clone(recoveredCurrentUser) : null,
    currentUserId: recoveredCurrentUser?.id ?? null,
    users: clone(users),
    weightEntries: clone(Array.from(weightByDay.values())),
    progressPhotos: clone(progressPhotos),
    posts: clone(posts),
    reactions: clone(Array.from(reactionByUserPost.values())),
  };
}

function readFromStorage(): Snapshot | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    return normalizeSnapshot(JSON.parse(raw));
  } catch {
    // Invalid JSON or an unavailable storage backend should not brick the app.
    return null;
  }
}

function persist(snapshot: Snapshot): boolean {
  if (!isBrowser()) return true;
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(snapshot));
    return true;
  } catch {
    // Quota/security errors leave the in-memory state usable for this session.
    return false;
  }
}

function installStorageListener(): void {
  if (!isBrowser() || storageListenerInstalled || typeof window.addEventListener !== "function") return;
  storageListenerInstalled = true;
  window.addEventListener("storage", (event) => {
    if (event.key !== STORE_KEY && event.key !== null) return;
    if (event.key === null || !event.newValue) {
      snapshotCache = createSeedSnapshot();
      notify();
      return;
    }
    const incoming = readFromStorage();
    if (!incoming) return;
    snapshotCache = incoming;
    notify();
  });
}

function ensureSnapshot(): Snapshot {
  if (isBrowser()) {
    if (!hydratedFromBrowser) {
      hydratedFromBrowser = true;
      const stored = readFromStorage();
      snapshotCache = stored ?? createSeedSnapshot();
      if (!stored) persist(snapshotCache);
      installStorageListener();
    }
  } else if (!snapshotCache) {
    snapshotCache = createSeedSnapshot();
  }
  return snapshotCache!;
}

/** Subscribe to same-tab and cross-tab changes. Useful with useSyncExternalStore. */
export function subscribe(listener: StoreListener): () => void {
  listeners.add(listener);
  ensureSnapshot();
  return () => listeners.delete(listener);
}

/** Return the current in-memory snapshot (stable until the next mutation). */
export function getSnapshot(): Snapshot {
  return ensureSnapshot();
}

/** Stable snapshot used only while React is rendering on the server. */
export function getServerSnapshot(): Snapshot {
  return SERVER_SNAPSHOT;
}

/** Return an immutable-by-convention copy for code that intends to inspect only. */
export function getSnapshotCopy(): Snapshot {
  return clone(ensureSnapshot());
}

/** Persist a complete versioned snapshot and notify subscribers. */
export function saveSnapshot(next: Snapshot): Snapshot {
  return commitSnapshot(next, false)!;
}

/**
 * Internal commit primitive. Large photo writes can require durable browser
 * persistence so the UI can report quota failures instead of showing a false
 * success, while small mutations remain usable in memory if storage is blocked.
 */
function commitSnapshot(next: Snapshot, requirePersistence: boolean): Snapshot | null {
  const normalized = normalizeSnapshot(next);
  if (requirePersistence && !persist(normalized)) return null;
  snapshotCache = normalized;
  hydratedFromBrowser = hydratedFromBrowser || isBrowser();
  if (!requirePersistence) persist(normalized);
  notify();
  return normalized;
}

export function getCurrentUser(snapshot: Snapshot = getSnapshot()): User | null {
  return snapshot.currentUser;
}

export function getUserById(userId: string, snapshot: Snapshot = getSnapshot()): User | null {
  return snapshot.users.find((user) => user.id === userId) ?? null;
}

export function getUserWeights(
  userId: string,
  snapshot: Snapshot = getSnapshot(),
): WeightEntry[] {
  return snapshot.weightEntries
    .filter((entry) => entry.userId === userId)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function getLatestWeight(
  entries: WeightEntry[],
  asOfDate?: string,
): WeightEntry | null {
  const filtered = entries
    .filter((entry) => !asOfDate || entry.date <= asOfDate)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  return filtered.at(-1) ?? null;
}

export function getPreviousWeight(
  entries: WeightEntry[],
  asOfDate?: string,
): WeightEntry | null {
  const filtered = entries
    .filter((entry) => !asOfDate || entry.date < asOfDate)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  return filtered.at(-1) ?? null;
}

function numericWeight(value: WeightEntry | number): number {
  return typeof value === "number" ? value : value.weightKg ?? value.weight;
}

/**
 * Return current minus previous weight. A negative result means weight loss.
 * The array overload compares its latest two entries.
 */
export function calculateWeightDelta(entries: WeightEntry[]): number | null;
export function calculateWeightDelta(
  current: WeightEntry | number,
  previous?: WeightEntry | number,
): number | null;
export function calculateWeightDelta(
  current: WeightEntry[] | WeightEntry | number,
  previous?: WeightEntry | number,
): number | null {
  if (Array.isArray(current)) {
    const sorted = current
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
    if (sorted.length < 2) return null;
    return numericWeight(sorted.at(-1)!) - numericWeight(sorted.at(-2)!);
  }
  if (previous === undefined) return null;
  return numericWeight(current) - numericWeight(previous);
}

/** Alias used by dashboard/analytics components. */
export const getWeightDelta = calculateWeightDelta;

/** Positive-only amount lost between two readings (0 when weight increased). */
export function calculateWeightLoss(
  current: WeightEntry | number,
  previous: WeightEntry | number,
): number {
  return Math.max(0, -(calculateWeightDelta(current, previous) ?? 0));
}

/** Calculate progress toward a lower target, clamped to 0–100. */
export function calculateProgress(
  startWeight: number,
  targetWeight: number,
  currentWeight: number,
): number {
  if (![startWeight, targetWeight, currentWeight].every(Number.isFinite)) return 0;
  if (startWeight <= 0 || targetWeight <= 0) return 0;
  const total = startWeight - targetWeight;
  if (total <= 0) return currentWeight <= targetWeight ? 100 : 0;
  const percent = ((startWeight - currentWeight) / total) * 100;
  return Math.min(100, Math.max(0, Math.round(percent * 10) / 10));
}

export const calculateProgressPercentage = calculateProgress;
export const getProgressPercent = calculateProgress;

export function kgToLb(value: number): number {
  return Math.round(value * 2.2046226218 * 10) / 10;
}

export function lbToKg(value: number): number {
  return Math.round((value / 2.2046226218) * 10) / 10;
}

export function convertWeight(value: number, from: "kg" | "lb", to: "kg" | "lb"): number {
  if (!Number.isFinite(value) || from === to) return value;
  return from === "kg" ? kgToLb(value) : lbToKg(value);
}

export function getUserProgress(
  user: User,
  currentWeight?: number,
  snapshot: Snapshot = getSnapshot(),
): number {
  const latest =
    currentWeight ?? getLatestWeight(getUserWeights(user.id, snapshot))?.weightKg ?? user.goal.startWeightKg;
  return calculateProgress(user.goal.startWeightKg, user.goal.targetWeightKg, latest);
}

/** Number of consecutive calendar-day entries ending at the latest entry. */
export function getLoggingStreak(entries: WeightEntry[]): number {
  if (!entries.length) return 0;
  const days = new Set(entries.map((entry) => entry.date));
  const sorted = entries.slice().sort((a, b) => a.date.localeCompare(b.date));
  let cursor = sorted.at(-1)!.date;
  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    const date = new Date(`${cursor}T00:00:00`);
    date.setDate(date.getDate() - 1);
    cursor = toDateKey(date);
  }
  return streak;
}

function getAuthenticatedSnapshot(): Snapshot | null {
  const snapshot = ensureSnapshot();
  return snapshot.currentUser ? snapshot : null;
}

/** Log in against the local demo credential store. */
export function login(username: string, password: string): AuthResult {
  const normalized = normalizeUsername(username);
  if (!normalized) {
    return {
      ok: false,
      success: false,
      error: "Enter a username.",
      message: "Enter a username.",
      field: "username",
    };
  }
  if (!password) {
    return {
      ok: false,
      success: false,
      error: "Enter a password.",
      message: "Enter a password.",
      field: "password",
    };
  }
  const snapshot = ensureSnapshot();
  const user = snapshot.users.find((candidate) => candidate.username === normalized);
  const valid =
    user &&
    ((typeof user.password === "string" && user.password === password) ||
      (typeof user.passwordHash === "string" && user.passwordHash === password));
  if (!user || !valid) {
    return {
      ok: false,
      success: false,
      error: "The username or password is incorrect.",
      message: "The username or password is incorrect.",
      field: "general",
    };
  }
  const next = saveSnapshot({ ...snapshot, currentUser: clone(user), currentUserId: user.id });
  return { ok: true, success: true, user: clone(user), snapshot: next };
}

function parseOptionalWeight(value: unknown): number | null {
  const parsed = asFiniteNumber(value);
  if (parsed === null || parsed < MIN_WEIGHT_KG || parsed > MAX_WEIGHT_KG) return null;
  return Math.round(parsed * 10) / 10;
}

/** Register a local demo account and sign it in immediately. */
export function register(input: RegisterInput): AuthResult {
  const username = normalizeUsername(input?.username ?? "");
  const password = input?.password ?? "";
  const displayName = (input?.displayName ?? "").trim();
  if (username.length < 3) {
    return {
      ok: false,
      success: false,
      error: "Username must be at least 3 characters.",
      message: "Username must be at least 3 characters.",
      field: "username",
    };
  }
  if (username.length > MAX_USERNAME_LENGTH || !/^[a-z0-9_.-]+$/i.test(username)) {
    return {
      ok: false,
      success: false,
      error: "Username may contain only Latin letters, numbers, dots, underscores, and hyphens.",
      message: "Username may contain only Latin letters, numbers, dots, underscores, and hyphens.",
      field: "username",
    };
  }
  if (password.length < 6) {
    return {
      ok: false,
      success: false,
      error: "Password must be at least 6 characters.",
      message: "Password must be at least 6 characters.",
      field: "password",
    };
  }
  const snapshot = ensureSnapshot();
  if (snapshot.users.some((user) => user.username === username)) {
    return {
      ok: false,
      success: false,
      error: "That username is already registered.",
      message: "That username is already registered.",
      field: "username",
    };
  }

  const startWeight =
    parseOptionalWeight(input.startWeightKg) ?? parseOptionalWeight(input.startWeight) ?? 0;
  const goalWeight =
    parseOptionalWeight(input.goalWeightKg) ?? parseOptionalWeight(input.goalWeight) ?? 0;
  const startDate = toDateKey(input.startDate);
  const user: User = {
    id: makeId("user"),
    username,
    displayName: (displayName || username).slice(0, MAX_DISPLAY_NAME_LENGTH),
    createdAt: new Date().toISOString(),
    goal: {
      ...defaultGoal(startWeight, goalWeight, startDate),
      targetDate: input.targetDate ? toDateKey(input.targetDate) : undefined,
      unit: input.unit === "lb" ? "lb" : "kg",
    },
    unit: input.unit === "lb" ? "lb" : "kg",
    initials: initialsFor(displayName || username),
    password,
    isDemo: false,
  };
  const next = saveSnapshot({
    ...snapshot,
    users: [...snapshot.users, user],
    currentUser: clone(user),
    currentUserId: user.id,
  });
  return { ok: true, success: true, user: clone(user), snapshot: next };
}

export function logout(): Snapshot {
  const snapshot = ensureSnapshot();
  return saveSnapshot({ ...snapshot, currentUser: null, currentUserId: null });
}

/** Reset this browser's data to the deterministic demo fixture. */
export function resetStore(): Snapshot {
  const next = createSeedSnapshot();
  snapshotCache = next;
  hydratedFromBrowser = hydratedFromBrowser || isBrowser();
  persist(next);
  notify();
  return next;
}

function coerceWeightInput(
  entryOrWeight: WeightEntryInput | number,
  date?: string | Date,
  note?: string,
): WeightEntryInput {
  if (typeof entryOrWeight === "number") {
    return { weight: entryOrWeight, date, note };
  }
  return entryOrWeight ?? {};
}

/** Add or edit one weight entry for the authenticated user (one per day). */
export function addWeightEntry(
  entryOrWeight: WeightEntryInput | number,
  date?: string | Date,
  note?: string,
): WeightEntry | null {
  const snapshot = getAuthenticatedSnapshot();
  if (!snapshot) return null;
  const input = coerceWeightInput(entryOrWeight, date, note);
  const parsedWeight = parseOptionalWeight(input.weightKg) ?? parseOptionalWeight(input.weight);
  if (parsedWeight === null) return null;
  const dateKey = toDateKey(input.date);
  if (!isDateKey(dateKey)) return null;
  const existingIndex = snapshot.weightEntries.findIndex(
    (entry) => entry.userId === snapshot.currentUser!.id && entry.date === dateKey,
  );
  const existing = existingIndex >= 0 ? snapshot.weightEntries[existingIndex] : null;
  const entry: WeightEntry = {
    id: input.id || existing?.id || makeId("weight"),
    userId: snapshot.currentUser!.id,
    date: dateKey,
    weight: parsedWeight,
    weightKg: parsedWeight,
    value: parsedWeight,
    note:
      typeof input.note === "string" && input.note.trim() ? input.note.trim() : undefined,
    createdAt: input.createdAt || existing?.createdAt || new Date().toISOString(),
  };
  const entries = snapshot.weightEntries.slice();
  if (existingIndex >= 0) entries[existingIndex] = entry;
  else entries.push(entry);
  saveSnapshot({ ...snapshot, weightEntries: entries });
  return clone(entry);
}

function coercePhotoInput(
  photoOrSource: ProgressPhotoInput | string,
  date?: string | Date,
  caption?: string,
): ProgressPhotoInput {
  if (typeof photoOrSource === "string") return { dataUrl: photoOrSource, date, caption };
  return photoOrSource ?? {};
}

/** Save photo metadata/data URL for the authenticated user. */
export function addProgressPhoto(
  photoOrSource: ProgressPhotoInput | string,
  date?: string | Date,
  caption?: string,
): ProgressPhoto | null {
  const snapshot = getAuthenticatedSnapshot();
  if (!snapshot) return null;
  const input = coercePhotoInput(photoOrSource, date, caption);
  const source = [input.dataUrl, input.imageUrl, input.url, input.src].find(
    (item): item is string => typeof item === "string" && item.trim().length > 0,
  );
  if (!source || source.length > 8_000_000) return null;
  const dateKey = toDateKey(input.date ?? input.takenAt);
  if (!isDateKey(dateKey)) return null;
  const photo: ProgressPhoto = {
    id: input.id || makeId("photo"),
    userId: snapshot.currentUser!.id,
    date: dateKey,
    takenAt: dateKey,
    dataUrl: source,
    imageUrl: source,
    url: source,
    src: source,
    caption: typeof input.caption === "string" ? input.caption.trim() : undefined,
    visibility: input.visibility === "feed" ? "feed" : "private",
    createdAt: input.createdAt || new Date().toISOString(),
  };
  const saved = commitSnapshot(
    { ...snapshot, progressPhotos: [...snapshot.progressPhotos, photo] },
    true,
  );
  if (!saved) return null;
  return clone(photo);
}

function reactionTypeFromInput(input: ReactionInput): ReactionType | null {
  return normalizeReactionType(typeof input === "string" ? input : input?.type);
}

/**
 * Toggle one reaction per user/post. Selecting a different reaction replaces
 * the previous one; selecting the active reaction removes it.
 */
export function toggleReaction(
  postId: string,
  reactionInput: ReactionInput,
): ReactionToggleResult {
  const snapshot = ensureSnapshot();
  const userId = snapshot.currentUser?.id;
  const type = reactionTypeFromInput(reactionInput);
  const post = snapshot.posts.find((candidate) => candidate.id === postId);
  if (!userId || !post || !type) {
    return {
      ok: false,
      active: false,
      reaction: null,
      post: post ? clone(post) : null,
      snapshot,
      error: !userId ? "Sign in before reacting." : "That reaction is not supported.",
    };
  }

  const reactions = snapshot.reactions.slice();
  const existingIndex = reactions.findIndex(
    (item) => item.postId === postId && item.userId === userId,
  );
  const existing = existingIndex >= 0 ? reactions[existingIndex] : null;
  const counts: ReactionCounts = { ...post.reactions };
  const decrement = (key: string) => {
    if (typeof counts[key] === "number") counts[key] = Math.max(0, counts[key] - 1);
  };
  let active = false;
  let nextReaction: Reaction | null = null;

  if (existing && existing.type === type) {
    reactions.splice(existingIndex, 1);
    decrement(existing.type);
  } else {
    if (existing) {
      decrement(existing.type);
      reactions.splice(existingIndex, 1);
    }
    nextReaction = {
      id: existing?.id || makeId("reaction"),
      postId,
      userId,
      type,
      createdAt: existing?.createdAt || new Date().toISOString(),
    };
    reactions.push(nextReaction);
    counts[type] = (counts[type] ?? 0) + 1;
    active = true;
  }

  const updatedPost: CommunityPost = { ...post, reactions: counts };
  const next = saveSnapshot({
    ...snapshot,
    posts: snapshot.posts.map((candidate) =>
      candidate.id === postId ? updatedPost : candidate,
    ),
    reactions,
  });
  return {
    ok: true,
    active,
    reaction: nextReaction ? clone(nextReaction) : null,
    post: clone(next.posts.find((candidate) => candidate.id === postId) ?? updatedPost),
    snapshot: next,
  };
}

export function getReactionForUser(
  postId: string,
  userId = getSnapshot().currentUser?.id,
  snapshot: Snapshot = getSnapshot(),
): Reaction | null {
  if (!userId) return null;
  return snapshot.reactions.find((reaction) => reaction.postId === postId && reaction.userId === userId) ?? null;
}

// Re-export demo values from this convenient entry point for auth hints/tests.
export { DEMO_PASSWORD, DEMO_USER_ID, DEMO_USERNAME };
