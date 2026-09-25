import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const USERNAME_PATTERN = /^[a-z0-9_.-]{3,32}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MIN_WEIGHT_KG = 20;
const MAX_WEIGHT_KG = 400;

type RegistrationBody = {
  username?: unknown;
  password?: unknown;
  displayName?: unknown;
  startWeightKg?: unknown;
  targetWeightKg?: unknown;
  startDate?: unknown;
  targetDate?: unknown;
  unit?: unknown;
  feedOptIn?: unknown;
};

function normalizeUsername(value: unknown): string {
  return typeof value === "string"
    ? value.trim().normalize("NFKC").toLowerCase()
    : "";
}

function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function weight(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < MIN_WEIGHT_KG || parsed > MAX_WEIGHT_KG) {
    return null;
  }
  return Math.round(parsed * 100) / 100;
}

function configuration() {
  const healthyUrl = process.env.HEALTHY_SUPABASE_URL?.trim();
  const healthySecret = (
    process.env.HEALTHY_SUPABASE_SECRET_KEY ||
    process.env.HEALTHY_SUPABASE_SERVICE_ROLE_KEY
  )?.trim();
  if (healthyUrl && healthySecret) {
    return { url: healthyUrl.replace(/\/+$/, ""), secret: healthySecret };
  }

  const url = (
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ""
  )
    .trim()
    .replace(/\/+$/, "");
  const secret = (
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ""
  ).trim();
  return url && secret ? { url, secret } : null;
}

function failure(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return failure("Registration requests must use JSON.", 415);
  }

  let body: RegistrationBody;
  try {
    body = (await request.json()) as RegistrationBody;
  } catch {
    return failure("The registration request is not valid JSON.", 400);
  }

  const username = normalizeUsername(body.username);
  const password = typeof body.password === "string" ? body.password : "";
  const displayName =
    typeof body.displayName === "string" ? body.displayName.trim() : "";
  const startWeightKg = weight(body.startWeightKg);
  const targetWeightKg = weight(body.targetWeightKg);
  const startDate = body.startDate;
  const targetDate = body.targetDate;

  if (!USERNAME_PATTERN.test(username)) {
    return failure(
      "Username must contain 3–32 lowercase letters, numbers, dots, hyphens, or underscores.",
      400,
    );
  }
  if (password.length < 8 || password.length > 72) {
    return failure("Password must contain 8–72 characters.", 400);
  }
  if (!displayName || displayName.length > 50) {
    return failure("Display name must contain 1–50 characters.", 400);
  }
  if (startWeightKg === null || targetWeightKg === null) {
    return failure("Start and goal weights must be between 20 and 400 kg.", 400);
  }
  if (targetWeightKg >= startWeightKg) {
    return failure("Goal weight must be lower than start weight.", 400);
  }
  if (!validDate(startDate)) {
    return failure("Start date must be a valid YYYY-MM-DD date.", 400);
  }
  if (targetDate != null && targetDate !== "" && !validDate(targetDate)) {
    return failure("Target date must be a valid YYYY-MM-DD date.", 400);
  }
  if (typeof targetDate === "string" && targetDate && targetDate < startDate) {
    return failure("Target date cannot be before the start date.", 400);
  }

  const config = configuration();
  if (!config) {
    return failure("Account registration is not configured on this deployment.", 503);
  }

  const email = `${username}@accounts.healthy.invalid`;
  const headers = new Headers({
    apikey: config.secret,
    "Content-Type": "application/json",
  });
  // New `sb_secret_...` keys are authenticated by `apikey` alone; adding one
  // as a Bearer value produces `Invalid JWT`. The legacy service-role key is
  // itself a JWT and still requires the Authorization header.
  if (config.secret.startsWith("eyJ")) {
    headers.set("Authorization", `Bearer ${config.secret}`);
  }

  let response: Response;
  try {
    response = await fetch(`${config.url}/auth/v1/admin/users`, {
      method: "POST",
      cache: "no-store",
      headers,
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          username,
          display_name: displayName,
          start_weight_kg: startWeightKg,
          goal_weight_kg: targetWeightKg,
          start_date: startDate,
          target_date:
            typeof targetDate === "string" && targetDate ? targetDate : null,
          unit: body.unit === "lb" ? "lb" : "kg",
          feed_opt_in: body.feedOptIn !== false,
        },
      }),
    });
  } catch {
    return failure("Account registration is temporarily unavailable.", 502);
  }

  if (!response.ok) {
    let message = "";
    try {
      const payload = (await response.json()) as {
        message?: unknown;
        error_description?: unknown;
        error?: unknown;
      };
      message = String(
        payload.message || payload.error_description || payload.error || "",
      ).toLowerCase();
    } catch {
      // Return a stable, non-sensitive error below.
    }
    if (
      response.status === 409 ||
      message.includes("already") ||
      message.includes("registered") ||
      message.includes("duplicate")
    ) {
      return failure("That username is already in use.", 409);
    }
    return failure("Your account could not be created. Please try again.", 502);
  }

  return NextResponse.json(
    { ok: true },
    {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
