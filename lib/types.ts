/**
 * Shared domain types for the client-only Healthy prototype.
 *
 * The store deliberately keeps these types free of React/Next.js concerns. It
 * makes the persistence layer replaceable when the app is moved to a hosted
 * database later on.
 */

export const STORE_KEY = "healthy-store-v1" as const;
export const STORE_VERSION = 2 as const;

export type WeightUnit = "kg" | "lb";

/** The three reactions shown in the first version of the community feed. */
export type ReactionType =
  | "encourage"
  | "celebrate"
  | "fire"
  | "support"
  | "heart"
  | "like"
  // These aliases make the store tolerant of an older/experimental UI.
  | "cheer"
  | "strong";

export type PostType =
  | "weight_loss"
  | "streak"
  | "goal_milestone"
  | "photo"
  | "milestone"
  | "custom";

export interface Goal {
  /** Starting weight in kilograms. */
  startWeightKg: number;
  /** Target weight in kilograms. */
  targetWeightKg: number;
  startDate: string;
  targetDate?: string;
  unit?: WeightUnit;

  // Friendly aliases retained for UI code written before the kg suffix was
  // introduced. They are always populated by the store normalizer.
  startWeight?: number;
  targetWeight?: number;
}

export interface User {
  id: string;
  username: string;
  displayName: string;
  createdAt: string;
  goal: Goal;
  /** Convenience aliases for lightweight cards. */
  startWeight?: number;
  goalWeight?: number;
  targetWeight?: number;
  unit?: WeightUnit;
  avatarUrl?: string;
  initials?: string;
  /**
   * Demo-only credential. This must be replaced with managed auth before the
   * app is used with real accounts. It is optional so a future auth adapter can
   * omit credentials entirely.
   */
  password?: string;
  passwordHash?: string;
  isDemo?: boolean;
}

export interface WeightEntry {
  id: string;
  userId: string;
  /** Local calendar date (`YYYY-MM-DD`), not a UTC timestamp. */
  date: string;
  /** Weight in kilograms. This is the short, UI-friendly field. */
  weight: number;
  /** Canonical kg alias; populated together with `weight`. */
  weightKg: number;
  /** Alias accepted by chart/list components. */
  value?: number;
  note?: string;
  createdAt: string;
}

export type WeightEntryInput = {
  id?: string;
  userId?: string;
  date?: string | Date;
  weight?: number | string;
  weightKg?: number | string;
  note?: string;
  createdAt?: string;
};

export interface ProgressPhoto {
  id: string;
  userId: string;
  /** Local calendar date (`YYYY-MM-DD`). */
  date: string;
  takenAt?: string;
  /** A compressed data URL in local mode, or a remote URL in a hosted mode. */
  dataUrl: string;
  /** URL aliases make migration to object storage straightforward. */
  imageUrl?: string;
  url?: string;
  src?: string;
  caption?: string;
  visibility?: "private" | "feed";
  createdAt: string;
}

export type ProgressPhotoInput = {
  id?: string;
  userId?: string;
  date?: string | Date;
  takenAt?: string | Date;
  dataUrl?: string;
  imageUrl?: string;
  url?: string;
  src?: string;
  caption?: string;
  visibility?: "private" | "feed";
  createdAt?: string;
};

export interface Reaction {
  id: string;
  postId: string;
  userId: string;
  type: ReactionType;
  createdAt: string;
}

export type ReactionCounts = Partial<Record<ReactionType, number>> &
  Record<string, number>;

export interface CommunityPost {
  id: string;
  userId: string;
  type: PostType;
  kind?: PostType;
  date: string;
  createdAt: string;
  body: string;
  /** Persian copy/title aliases used by different feed presentations. */
  copy?: string;
  title?: string;
  text?: string;
  authorName?: string;
  authorInitials?: string;
  metricValue?: number;
  value?: number;
  metricLabel?: string;
  activityKey?: string;
  generated?: boolean;
  reactions: ReactionCounts;
}

/** `Post` is kept as a concise alias for feature components. */
export type Post = CommunityPost;
export type ActivityPost = CommunityPost;

export interface Snapshot {
  version: typeof STORE_VERSION;
  currentUser: User | null;
  /** Persisted session seam; kept alongside `currentUser` for easy migration. */
  currentUserId?: string | null;
  users: User[];
  weightEntries: WeightEntry[];
  progressPhotos: ProgressPhoto[];
  posts: CommunityPost[];
  reactions: Reaction[];
}

export type StoreSnapshot = Snapshot;

export interface RegisterInput {
  username: string;
  password: string;
  displayName?: string;
  startWeight?: number | string;
  startWeightKg?: number | string;
  goalWeight?: number | string;
  goalWeightKg?: number | string;
  startDate?: string | Date;
  targetDate?: string | Date;
  unit?: WeightUnit;
}

export interface AuthUserResult {
  ok: true;
  success: true;
  user: User;
  snapshot: Snapshot;
}

export interface AuthErrorResult {
  ok: false;
  success: false;
  error: string;
  /** UI-friendly alias retained for auth forms. */
  message: string;
  field?: "username" | "password" | "displayName" | "general";
}

export type AuthResult = AuthUserResult | AuthErrorResult;

export interface ReactionToggleResult {
  ok: boolean;
  active: boolean;
  reaction: Reaction | null;
  post: CommunityPost | null;
  snapshot: Snapshot;
  error?: string;
}

export type ReactionInput = ReactionType | { type: ReactionType };

export type StoreListener = () => void;
