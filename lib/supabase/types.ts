import type {
  CommunityPost,
  ProgressPhoto,
  Reaction,
  ReactionType,
  User,
  WeightEntry,
  WeightUnit,
} from "../types";

/** Configuration for the browser-safe Supabase REST/Auth adapter. */
export interface SupabaseConfig {
  /** `https://<project-ref>.supabase.co` (without a trailing slash). */
  url: string;
  /** The public anon/publishable key. Never put a service-role key here. */
  anonKey: string;
  /** Dependency injection seam for tests and edge runtimes. */
  fetch?: typeof fetch;
}

export interface SupabaseAuthUser {
  id: string;
  email?: string;
  phone?: string;
  user_metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface SupabaseSession {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  expires_at?: number;
  user: SupabaseAuthUser;
}

export interface HostedSession {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  user: SupabaseAuthUser;
  profile: User;
}

export interface HostedRegisterInput {
  /** Supabase Auth requires a real email or phone identity; no fake email is generated. */
  email: string;
  password: string;
  username: string;
  displayName?: string;
  startWeightKg?: number;
  targetWeightKg?: number;
  startDate?: string;
  targetDate?: string;
  unit?: WeightUnit;
  feedOptIn?: boolean;
  emailRedirectTo?: string;
}

export interface HostedLoginInput {
  email: string;
  password: string;
}

export interface HostedAuthResult {
  session: HostedSession | null;
  /** True when Supabase accepted signup but requires email confirmation first. */
  needsEmailConfirmation?: boolean;
  user: SupabaseAuthUser | null;
}

export interface ProfilePatch {
  displayName?: string;
  username?: string;
  startWeightKg?: number | null;
  targetWeightKg?: number | null;
  startDate?: string;
  targetDate?: string | null;
  unit?: WeightUnit;
  feedOptIn?: boolean;
}

export interface WeightEntryInput {
  date: string;
  weightKg: number;
  note?: string;
}

export interface ProgressPhotoInput {
  date: string;
  caption?: string;
  visibility?: "private" | "feed";
}

export interface HostedProgressPhoto extends ProgressPhoto {
  storagePath: string;
}

export interface HostedReactionResult {
  active: boolean;
  reaction: Reaction | null;
  counts: Record<string, number>;
}

export interface HostedFeedResult {
  posts: CommunityPost[];
  reactions: Reaction[];
}

export interface SupabaseProfileRow {
  id: string;
  username: string;
  display_name: string;
  unit: WeightUnit;
  start_weight_kg: number | null;
  goal_weight_kg: number | null;
  start_date: string;
  target_date: string | null;
  feed_opt_in: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupabaseWeightRow {
  id: string;
  user_id: string;
  recorded_on: string;
  weight_kg: number;
  note: string | null;
  created_at: string;
}

export interface SupabasePhotoRow {
  id: string;
  user_id: string;
  taken_on: string;
  storage_path: string;
  caption: string | null;
  visibility: "private" | "feed";
  created_at: string;
}

export interface SupabasePostRow {
  id: string;
  user_id: string;
  type: CommunityPost["type"];
  occurred_on: string;
  body: string;
  title: string | null;
  metric_value: number | null;
  metric_label: string | null;
  activity_key: string | null;
  generated: boolean;
  created_at: string;
}

export interface SupabaseReactionRow {
  id: string;
  post_id: string;
  user_id: string;
  type: ReactionType;
  created_at: string;
}

export interface SupabaseRpcReactionResult {
  active: boolean;
  type?: ReactionType | null;
  reaction_id?: string | null;
  created_at?: string | null;
}

