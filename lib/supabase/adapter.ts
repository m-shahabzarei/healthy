import type {
  CommunityPost,
  Goal,
  ProgressPhoto,
  Reaction,
  ReactionType,
  User,
  WeightEntry,
  WeightUnit,
} from "../types";
import {
  SupabaseAdapterError,
  SupabaseRestClient,
} from "./rest";
import type {
  HostedAuthResult,
  HostedFeedResult,
  HostedLoginInput,
  HostedProgressPhoto,
  HostedReactionResult,
  HostedRegisterInput,
  HostedSession,
  ProfilePatch,
  ProgressPhotoInput,
  SupabaseAuthUser,
  SupabaseConfig,
  SupabaseFeedProfileRow,
  SupabasePhotoRow,
  SupabasePostRow,
  SupabaseProfileRow,
  SupabaseReactionRow,
  SupabaseRpcReactionResult,
  SupabaseSession,
  SupabaseWeightRow,
  WeightEntryInput,
} from "./types";
import { hasSupabaseEnv, readSupabaseEnv } from "./env";

const MIN_WEIGHT_KG = 20;
const MAX_WEIGHT_KG = 400;
const PHOTO_BUCKET = "progress-photos";
const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
const PHOTO_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;
type AllowedPhotoMime = keyof typeof PHOTO_EXTENSIONS;

export interface SupabaseAdapterOptions extends SupabaseConfig {
  /** Optional initial session restored by the host application. */
  session?: HostedSession;
}

export const SUPABASE_SCHEMA = {
  profiles: "profiles",
  weights: "weights",
  photos: "photos",
  posts: "posts",
  reactions: "reactions",
  photoBucket: PHOTO_BUCKET,
} as const;

function finite(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function requiredDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new SupabaseAdapterError("Dates must use YYYY-MM-DD.", 400, "INVALID_DATE");
  }
  // Parse at UTC midnight. Parsing at local midnight and comparing its ISO
  // date rejects every otherwise-valid date in positive UTC offsets.
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new SupabaseAdapterError("Date is not valid.", 400, "INVALID_DATE");
  }
  return value;
}

function requiredWeight(value: number): number {
  const parsed = finite(value);
  if (parsed === null || parsed < MIN_WEIGHT_KG || parsed > MAX_WEIGHT_KG) {
    throw new SupabaseAdapterError("Weight must be between 20 and 400 kg.", 400, "INVALID_WEIGHT");
  }
  return Math.round(parsed * 100) / 100;
}

function username(value: string): string {
  const normalized = value.trim().normalize("NFKC").toLowerCase();
  if (!/^[a-z0-9_.-]{3,32}$/.test(normalized)) {
    throw new SupabaseAdapterError("Username must contain 3–32 Latin letters, numbers, dots, underscores, or hyphens.", 400, "INVALID_USERNAME");
  }
  return normalized;
}

function email(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(normalized)) {
    throw new SupabaseAdapterError("A valid email identity is required by hosted Supabase Auth.", 400, "INVALID_EMAIL");
  }
  return normalized;
}

function optionalWeight(value: number | undefined): number | null {
  if (value === undefined || value === null) return null;
  return requiredWeight(value);
}

function uid(): string {
  if (typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function requiredPhotoMime(file: Blob): AllowedPhotoMime {
  const mime = file.type.trim().toLowerCase() as AllowedPhotoMime;
  if (!Object.prototype.hasOwnProperty.call(PHOTO_EXTENSIONS, mime)) {
    throw new SupabaseAdapterError(
      "Photo must be a JPEG, PNG, or WebP image.",
      400,
      "INVALID_PHOTO_TYPE",
    );
  }
  return mime;
}

function goalFromProfile(profile: SupabaseProfileRow): Goal {
  const start = profile.start_weight_kg ?? 0;
  const target = profile.goal_weight_kg ?? 0;
  return {
    startWeightKg: start,
    targetWeightKg: target,
    startWeight: start,
    targetWeight: target,
    startDate: profile.start_date,
    targetDate: profile.target_date ?? undefined,
    unit: profile.unit,
  };
}

function toUser(profile: SupabaseProfileRow): User {
  const displayName = profile.display_name || profile.username;
  const initials = displayName.trim().split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const start = profile.start_weight_kg ?? 0;
  const target = profile.goal_weight_kg ?? 0;
  return {
    id: profile.id,
    username: profile.username,
    displayName,
    createdAt: profile.created_at,
    goal: goalFromProfile(profile),
    startWeight: start,
    goalWeight: target,
    targetWeight: target,
    unit: profile.unit,
    initials: initials || "?",
    feedOptIn: profile.feed_opt_in,
  };
}

function toWeight(row: SupabaseWeightRow): WeightEntry {
  return {
    id: row.id,
    userId: row.user_id,
    date: row.recorded_on,
    weight: row.weight_kg,
    weightKg: row.weight_kg,
    value: row.weight_kg,
    note: row.note ?? undefined,
    createdAt: row.created_at,
  };
}

function toPhoto(row: SupabasePhotoRow, url?: string): HostedProgressPhoto {
  const source = url || row.storage_path;
  const photo: HostedProgressPhoto = {
    id: row.id,
    userId: row.user_id,
    date: row.taken_on,
    takenAt: row.taken_on,
    dataUrl: source,
    imageUrl: source,
    url: source,
    src: source,
    storagePath: row.storage_path,
    caption: row.caption ?? undefined,
    visibility: row.visibility,
    createdAt: row.created_at,
  };
  return photo;
}

function toReaction(row: SupabaseReactionRow): Reaction {
  return {
    id: row.id,
    postId: row.post_id,
    userId: row.user_id,
    type: row.type,
    createdAt: row.created_at,
  };
}

function toPost(
  row: SupabasePostRow,
  profile?: Pick<SupabaseProfileRow, "username" | "display_name">,
  counts: Record<string, number> = {},
): CommunityPost {
  const displayName = profile?.display_name || profile?.username || "Healthy member";
  const initials = displayName.trim().split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    kind: row.type,
    date: row.occurred_on,
    createdAt: row.created_at,
    body: row.body,
    copy: row.body,
    title: row.title ?? undefined,
    text: row.body,
    authorName: displayName,
    authorInitials: initials || "?",
    metricValue: row.metric_value ?? undefined,
    value: row.metric_value ?? undefined,
    metricLabel: row.metric_label ?? undefined,
    activityKey: row.activity_key ?? undefined,
    generated: row.generated,
    reactions: counts,
  };
}

function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) search.set(key, String(value));
  });
  const rendered = search.toString();
  return rendered ? `?${rendered}` : "";
}

/** Supabase implementation used by Healthy's hosted browser store. */
export class SupabaseHealthyAdapter {
  readonly client: SupabaseRestClient;
  private session: HostedSession | null;

  constructor(options: SupabaseAdapterOptions) {
    this.client = new SupabaseRestClient(options);
    this.session = options.session ?? null;
  }

  getSession(): HostedSession | null {
    return this.session;
  }

  setSession(session: HostedSession | null): void {
    this.session = session;
  }

  private token(): string {
    if (!this.session?.accessToken) {
      throw new SupabaseAdapterError("Sign in is required for this hosted operation.", 401, "AUTH_REQUIRED");
    }
    return this.session.accessToken;
  }

  private userId(): string {
    return this.session?.profile.id || this.session?.user.id || (() => {
      throw new SupabaseAdapterError("Sign in is required for this hosted operation.", 401, "AUTH_REQUIRED");
    })();
  }

  private async profileForUser(user: SupabaseAuthUser, token = this.token()): Promise<SupabaseProfileRow> {
    const rows = await this.client.data<SupabaseProfileRow[]>(`profiles${query({ id: `eq.${user.id}`, select: "*", limit: 1 })}`, {
      accessToken: token,
    });
    if (!rows?.[0]) {
      throw new SupabaseAdapterError("Supabase profile is missing; run supabase/schema.sql and retry.", 500, "PROFILE_MISSING");
    }
    return rows[0];
  }

  private makeHostedSession(authSession: SupabaseSession, profile: SupabaseProfileRow): HostedSession {
    return {
      accessToken: authSession.access_token,
      refreshToken: authSession.refresh_token,
      expiresAt: authSession.expires_at,
      user: authSession.user,
      profile: toUser(profile),
    };
  }

  async signUp(input: HostedRegisterInput): Promise<HostedAuthResult> {
    const normalizedEmail = email(input.email);
    const normalizedUsername = username(input.username);
    if (input.password.length < 8) {
      throw new SupabaseAdapterError("Hosted passwords must contain at least 8 characters.", 400, "INVALID_PASSWORD");
    }
    const metadata = {
      username: normalizedUsername,
      display_name: (input.displayName?.trim() || normalizedUsername).slice(0, 50),
      start_weight_kg: optionalWeight(input.startWeightKg),
      goal_weight_kg: optionalWeight(input.targetWeightKg),
      start_date: input.startDate ?? null,
      target_date: input.targetDate ?? null,
      unit: input.unit === "lb" ? "lb" : "kg",
      feed_opt_in: input.feedOptIn === true,
    };
    const body: Record<string, unknown> = {
      email: normalizedEmail,
      password: input.password,
      data: metadata,
    };
    const signupPath = input.emailRedirectTo
      ? `/signup?redirect_to=${encodeURIComponent(input.emailRedirectTo)}`
      : "/signup";
    const response = await this.client.auth<{
      user: SupabaseAuthUser | null;
      session?: SupabaseSession | null;
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      expires_at?: number;
      token_type?: string;
    }>(signupPath, {
      method: "POST",
      body,
    });
    const rawSession = response.session || (response.access_token && response.user
      ? {
          access_token: response.access_token,
          refresh_token: response.refresh_token,
          expires_in: response.expires_in,
          expires_at: response.expires_at,
          token_type: response.token_type,
          user: response.user,
        }
      : null);
    if (!rawSession || !response.user) {
      return { session: null, user: response.user ?? null, needsEmailConfirmation: true };
    }
    const profile = await this.profileForUser(response.user, rawSession.access_token);
    const session = this.makeHostedSession(rawSession, profile);
    this.session = session;
    return { session, user: response.user };
  }

  async signIn(input: HostedLoginInput): Promise<HostedAuthResult> {
    const response = await this.client.auth<{ access_token: string; refresh_token?: string; expires_in?: number; expires_at?: number; token_type?: string; user: SupabaseAuthUser }>("/token?grant_type=password", {
      method: "POST",
      body: { email: email(input.email), password: input.password },
    });
    const authSession: SupabaseSession = {
      access_token: response.access_token,
      refresh_token: response.refresh_token,
      expires_in: response.expires_in,
      expires_at: response.expires_at,
      token_type: response.token_type,
      user: response.user,
    };
    const profile = await this.profileForUser(response.user, response.access_token);
    const session = this.makeHostedSession(authSession, profile);
    this.session = session;
    return { session, user: response.user };
  }

  /**
   * The runtime resolves usernames to internal Auth identities in the trusted
   * Next.js registration/login seam. This low-level adapter remains email-only
   * so a service key is never needed in the browser.
   */
  async signInWithUsername(_username: string, _password: string): Promise<never> {
    throw new SupabaseAdapterError(
      "Hosted Supabase Auth uses email/password. Add a server-side username resolver if username login is required.",
      400,
      "USERNAME_AUTH_REQUIRES_SERVER_RESOLVER",
    );
  }

  async refreshSession(refreshToken = this.session?.refreshToken): Promise<HostedSession> {
    if (!refreshToken) throw new SupabaseAdapterError("A refresh token is required.", 401, "REFRESH_TOKEN_MISSING");
    const response = await this.client.auth<SupabaseSession>("/token?grant_type=refresh_token", {
      method: "POST",
      body: { refresh_token: refreshToken },
    });
    const profile = await this.profileForUser(response.user, response.access_token);
    const session = this.makeHostedSession(response, profile);
    this.session = session;
    return session;
  }

  async signOut(): Promise<void> {
    if (this.session?.accessToken) {
      try {
        await this.client.auth("/logout", { method: "POST", accessToken: this.session.accessToken });
      } finally {
        this.session = null;
      }
      return;
    }
    this.session = null;
  }

  async getProfile(): Promise<User> {
    this.token();
    if (!this.session?.user) throw new SupabaseAdapterError("Signed-in user is unavailable.", 401, "AUTH_USER_MISSING");
    return toUser(await this.profileForUser(this.session.user));
  }

  async updateProfile(patch: ProfilePatch): Promise<User> {
    const body: Record<string, unknown> = {};
    if (patch.username !== undefined) body.username = username(patch.username);
    if (patch.displayName !== undefined) body.display_name = patch.displayName.trim().slice(0, 50);
    if (patch.unit !== undefined) body.unit = patch.unit;
    if (patch.feedOptIn !== undefined) body.feed_opt_in = patch.feedOptIn;
    if (patch.startWeightKg !== undefined) body.start_weight_kg = patch.startWeightKg === null ? null : requiredWeight(patch.startWeightKg);
    if (patch.targetWeightKg !== undefined) body.goal_weight_kg = patch.targetWeightKg === null ? null : requiredWeight(patch.targetWeightKg);
    if (patch.startDate !== undefined) body.start_date = requiredDate(patch.startDate);
    if (patch.targetDate !== undefined) body.target_date = patch.targetDate === null ? null : requiredDate(patch.targetDate);
    const rows = await this.client.data<SupabaseProfileRow[]>(`profiles${query({ id: `eq.${this.userId()}` })}`, {
      method: "PATCH",
      accessToken: this.token(),
      headers: { Prefer: "return=representation" },
      body,
    });
    if (!rows?.[0]) throw new SupabaseAdapterError("Profile update returned no row.", 500, "PROFILE_UPDATE_EMPTY");
    if (this.session) this.session = { ...this.session, profile: toUser(rows[0]) };
    return toUser(rows[0]);
  }

  async listWeights(): Promise<WeightEntry[]> {
    const rows = await this.client.data<SupabaseWeightRow[]>(`weights${query({ user_id: `eq.${this.userId()}`, select: "*", order: "recorded_on.asc,created_at.asc" })}`, { accessToken: this.token() });
    return (rows || []).map(toWeight);
  }

  async upsertWeight(input: WeightEntryInput): Promise<WeightEntry> {
    const row = {
      user_id: this.userId(),
      recorded_on: requiredDate(input.date),
      weight_kg: requiredWeight(input.weightKg),
      note: input.note?.trim() || null,
    };
    const rows = await this.client.data<SupabaseWeightRow[]>("weights?on_conflict=user_id%2Crecorded_on", {
      method: "POST",
      accessToken: this.token(),
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: row,
    });
    if (!rows?.[0]) throw new SupabaseAdapterError("Weight write returned no row.", 500, "WEIGHT_WRITE_EMPTY");
    return toWeight(rows[0]);
  }

  async listPhotos(): Promise<HostedProgressPhoto[]> {
    const rows = await this.client.data<SupabasePhotoRow[]>(`photos${query({ user_id: `eq.${this.userId()}`, select: "*", order: "taken_on.asc,created_at.asc" })}`, { accessToken: this.token() });
    return Promise.all((rows || []).map(async (row) => toPhoto(row, await this.createSignedPhotoUrl(row.storage_path))));
  }

  async uploadProgressPhoto(file: Blob, input: ProgressPhotoInput, _originalName?: string): Promise<HostedProgressPhoto> {
    const mime = requiredPhotoMime(file);
    if (file.size === 0) throw new SupabaseAdapterError("Photo cannot be empty.", 400, "EMPTY_PHOTO");
    if (file.size > MAX_PHOTO_BYTES) throw new SupabaseAdapterError("Photo must be 4 MB or smaller.", 400, "PHOTO_TOO_LARGE");
    const date = requiredDate(input.date);
    const path = `${this.userId()}/${uid()}.${PHOTO_EXTENSIONS[mime]}`;
    let metadataWritten = false;
    try {
      await this.client.storage(`/object/${PHOTO_BUCKET}/${path}`, {
        method: "POST",
        accessToken: this.token(),
        headers: { "Content-Type": mime, "x-upsert": "false" },
        body: file,
        json: false,
      });
      const rows = await this.client.data<SupabasePhotoRow[]>("photos", {
        method: "POST",
        accessToken: this.token(),
        headers: { Prefer: "return=representation" },
        body: {
          user_id: this.userId(),
          taken_on: date,
          storage_path: path,
          caption: input.caption?.trim() || null,
          visibility: "private",
        },
      });
      if (!rows?.[0]) throw new SupabaseAdapterError("Photo metadata write returned no row.", 500, "PHOTO_WRITE_EMPTY");
      metadataWritten = true;
      return toPhoto(rows[0], await this.createSignedPhotoUrl(path));
    } catch (error) {
      // Best-effort cleanup prevents orphaned objects when the metadata insert fails.
      if (!metadataWritten) {
        try {
          await this.client.storage(`/object/${PHOTO_BUCKET}/${path}`, { method: "DELETE", accessToken: this.token() });
        } catch {
          // Keep the original, actionable error.
        }
      }
      throw error;
    }
  }

  async createSignedPhotoUrl(storagePath: string, expiresIn = 3600): Promise<string> {
    const result = await this.client.storage<{ signedURL?: string; signedUrl?: string }>(`/object/sign/${PHOTO_BUCKET}/${storagePath}`, {
      method: "POST",
      accessToken: this.token(),
      body: { expiresIn },
    });
    const signed = result.signedURL || result.signedUrl;
    if (!signed) throw new SupabaseAdapterError("Supabase did not return a signed photo URL.", 502, "PHOTO_SIGN_EMPTY");
    return signed.startsWith("http")
      ? signed
      : `${this.client.url}/storage/v1${signed.startsWith("/") ? "" : "/"}${signed}`;
  }

  async deleteProgressPhoto(photo: Pick<HostedProgressPhoto, "id" | "storagePath">): Promise<void> {
    await this.client.data(`photos${query({ id: `eq.${photo.id}`, user_id: `eq.${this.userId()}` })}`, {
      method: "DELETE",
      accessToken: this.token(),
    });
    await this.client.storage(`/object/${PHOTO_BUCKET}/${photo.storagePath}`, { method: "DELETE", accessToken: this.token() });
  }

  async listFeed(limit = 100): Promise<HostedFeedResult> {
    const posts = await this.client.data<SupabasePostRow[]>(`posts${query({ select: "*", order: "occurred_on.desc,created_at.desc", limit: Math.max(1, Math.min(limit, 200)) })}`, { accessToken: this.token() });
    // Older databases may still contain photo events until their schema is reapplied.
    const postRows = (posts || []).filter((post) => (post.type as string) !== "photo");
    const userIds = Array.from(new Set(postRows.map((post) => post.user_id)));
    const profiles = userIds.length
      ? await this.client.rpc<SupabaseFeedProfileRow[]>(
          "list_feed_profiles",
          { p_user_ids: userIds },
          { accessToken: this.token() },
        )
      : [];
    const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]));
    const postIds = postRows.map((post) => post.id);
    const reactions = postIds.length
      ? await this.client.data<SupabaseReactionRow[]>(`reactions${query({ post_id: `in.(${postIds.join(",")})`, select: "*" })}`, { accessToken: this.token() })
      : [];
    const reactionRows = (reactions || []).map(toReaction);
    const counts = new Map<string, Record<string, number>>();
    reactionRows.forEach((reaction) => {
      const current = counts.get(reaction.postId) || {};
      current[reaction.type] = (current[reaction.type] || 0) + 1;
      counts.set(reaction.postId, current);
    });
    return {
      posts: postRows.map((post) => toPost(post, profileMap.get(post.user_id), counts.get(post.id) || {})),
      reactions: reactionRows,
    };
  }

  async createPost(input: Omit<CommunityPost, "id" | "createdAt" | "reactions">): Promise<CommunityPost> {
    if (input.userId !== this.userId()) throw new SupabaseAdapterError("Posts can only be created for the signed-in user.", 403, "POST_OWNER_MISMATCH");
    const rows = await this.client.data<SupabasePostRow[]>("posts", {
      method: "POST",
      accessToken: this.token(),
      headers: { Prefer: "return=representation" },
      body: {
        user_id: input.userId,
        type: input.type,
        occurred_on: requiredDate(input.date),
        body: input.body || input.copy || input.text || "",
        title: input.title || null,
        metric_value: input.metricValue ?? input.value ?? null,
        metric_label: input.metricLabel || null,
        activity_key: null,
        generated: false,
      },
    });
    if (!rows?.[0]) throw new SupabaseAdapterError("Post write returned no row.", 500, "POST_WRITE_EMPTY");
    return toPost(rows[0], undefined, {});
  }

  /** Generated activity is database-owned; retained only as a migration guard. */
  async syncGeneratedPosts(_posts: CommunityPost[]): Promise<CommunityPost[]> {
    throw new SupabaseAdapterError(
      "Generated community activity is maintained automatically by the database.",
      400,
      "GENERATED_POSTS_DATABASE_OWNED",
    );
  }

  async toggleReaction(postId: string, type: ReactionType): Promise<HostedReactionResult> {
    if (!["encourage", "celebrate", "fire"].includes(type)) {
      throw new SupabaseAdapterError("Unsupported reaction type.", 400, "INVALID_REACTION");
    }
    try {
      const rpc = await this.client.rpc<SupabaseRpcReactionResult>("toggle_reaction", { p_post_id: postId, p_type: type }, { accessToken: this.token() });
      const reaction = rpc.active && rpc.reaction_id
        ? { id: rpc.reaction_id, postId, userId: this.userId(), type: rpc.type || type, createdAt: rpc.created_at || new Date().toISOString() }
        : null;
      const counts = await this.reactionCounts(postId);
      return { active: rpc.active, reaction, counts };
    } catch (error) {
      // The SQL migration includes the RPC. Keep a safe fallback for projects
      // that have tables but have not yet applied the function portion.
      if (!(error instanceof SupabaseAdapterError) || ![404, 405, 406].includes(error.status)) throw error;
      const existing = await this.client.data<SupabaseReactionRow[]>(`reactions${query({ post_id: `eq.${postId}`, user_id: `eq.${this.userId()}`, select: "*", limit: 1 })}`, { accessToken: this.token() });
      const current = existing?.[0];
      if (current?.type === type) {
        await this.client.data(`reactions${query({ id: `eq.${current.id}`, user_id: `eq.${this.userId()}` })}`, { method: "DELETE", accessToken: this.token() });
        return { active: false, reaction: null, counts: await this.reactionCounts(postId) };
      }
      const rows = await this.client.data<SupabaseReactionRow[]>(("reactions" + (current ? query({ id: `eq.${current.id}` }) : "")), {
        method: current ? "PATCH" : "POST",
        accessToken: this.token(),
        headers: { Prefer: "return=representation" },
        body: current ? { type } : { post_id: postId, user_id: this.userId(), type },
      });
      return { active: true, reaction: rows?.[0] ? toReaction(rows[0]) : null, counts: await this.reactionCounts(postId) };
    }
  }

  private async reactionCounts(postId: string): Promise<Record<string, number>> {
    const rows = await this.client.data<SupabaseReactionRow[]>(`reactions${query({ post_id: `eq.${postId}`, select: "type" })}`, { accessToken: this.token() });
    return (rows || []).reduce<Record<string, number>>((result, row) => {
      result[row.type] = (result[row.type] || 0) + 1;
      return result;
    }, {});
  }
}

export function supabaseConfigFromEnv(env?: Record<string, string | undefined>): SupabaseConfig | null {
  return readSupabaseEnv(env);
}

export function createSupabaseAdapter(options?: SupabaseAdapterOptions): SupabaseHealthyAdapter | null {
  const resolved = options || supabaseConfigFromEnv();
  return resolved ? new SupabaseHealthyAdapter(resolved) : null;
}

export function isSupabaseConfigured(env?: Record<string, string | undefined>): boolean {
  return hasSupabaseEnv(env);
}

export { SupabaseAdapterError } from "./rest";
