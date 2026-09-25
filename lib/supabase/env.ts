import type { SupabaseConfig } from "./types";

// Direct property access is intentional: Next.js statically inlines only
// explicit NEXT_PUBLIC_* references in browser bundles.
const browserPublicEnv: Record<string, string | undefined> = {
  NEXT_PUBLIC_HEALTHY_SUPABASE_URL:
    process.env.NEXT_PUBLIC_HEALTHY_SUPABASE_URL,
  NEXT_PUBLIC_HEALTHY_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_HEALTHY_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_HEALTHY_SUPABASE_ANON_KEY:
    process.env.NEXT_PUBLIC_HEALTHY_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
};

/** Read only the browser-safe hosted configuration. */
export function readSupabaseEnv(
  env: Record<string, string | undefined> = browserPublicEnv,
): SupabaseConfig | null {
  const healthyUrl = env.NEXT_PUBLIC_HEALTHY_SUPABASE_URL?.trim();
  const healthyKey = (
    env.NEXT_PUBLIC_HEALTHY_SUPABASE_PUBLISHABLE_KEY ||
    env.NEXT_PUBLIC_HEALTHY_SUPABASE_ANON_KEY
  )?.trim();
  if (healthyUrl && healthyKey) {
    return { url: healthyUrl, anonKey: healthyKey };
  }

  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = (
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  )?.trim();
  return url && anonKey ? { url, anonKey } : null;
}

export function hasSupabaseEnv(
  env: Record<string, string | undefined> = browserPublicEnv,
): boolean {
  return readSupabaseEnv(env) !== null;
}
