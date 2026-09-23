/** Shared domain contracts for Healthy's hosted Supabase runtime. */
export const STORE_VERSION = 2 as const;

export type WeightUnit = "kg" | "lb";

/** The three reactions shown in the first version of the community feed. */
export type ReactionType =
  | "encourage"
  | "celebrate"
  | "fire";

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

  // Lightweight display aliases populated by the hosted adapter.
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
  /** Whether this member allows generated progress events in the community feed. */
  feedOptIn: boolean;
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

export interface ProgressPhoto {
  id: string;
  userId: string;
  /** Local calendar date (`YYYY-MM-DD`). */
  date: string;
  takenAt?: string;
  /** Short-lived signed URL returned by Supabase Storage. */
  dataUrl: string;
  /** URL aliases make migration to object storage straightforward. */
  imageUrl?: string;
  url?: string;
  src?: string;
  caption?: string;
  visibility?: "private" | "feed";
  createdAt: string;
}

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
  /** Copy/title aliases used by different feed presentations. */
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

export interface Snapshot {
  version: typeof STORE_VERSION;
  currentUser: User | null;
  currentUserId: string | null;
  users: User[];
  weightEntries: WeightEntry[];
  progressPhotos: ProgressPhoto[];
  posts: CommunityPost[];
  reactions: Reaction[];
}

/** Lifecycle of the Supabase-backed client store. */
export type HostedStatus = "booting" | "anonymous" | "ready" | "error";

/** Stable external-store value consumed by React's useSyncExternalStore. */
export interface HostedState {
  status: HostedStatus;
  snapshot: Snapshot;
  error: string | null;
}

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

export type ReactionInput = ReactionType | { type: ReactionType };

export type StoreListener = () => void;
