import type {
  Reaction,
  Snapshot,
  User,
  WeightEntry,
  WeightUnit,
} from "./types";

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** Format a Date using the local calendar day, avoiding UTC off-by-one errors. */
export function toDateKey(value: string | Date | undefined | null): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (isDateKey(trimmed)) return trimmed;
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

/** Return true only for a real Gregorian calendar date in YYYY-MM-DD form. */
export function isDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
}

/** Return a new chronological array; callers' data is never mutated. */
export function sortWeightEntries(entries: readonly WeightEntry[]): WeightEntry[] {
  return [...entries].sort(
    (a, b) =>
      a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt),
  );
}

export function getCurrentUser(snapshot: Snapshot): User | null {
  return snapshot.currentUser;
}

export function getUserById(userId: string, snapshot: Snapshot): User | null {
  return snapshot.users.find((user) => user.id === userId) ?? null;
}

export function getUserWeights(userId: string, snapshot: Snapshot): WeightEntry[] {
  return sortWeightEntries(
    snapshot.weightEntries.filter((entry) => entry.userId === userId),
  );
}

export function getLatestWeight(
  entries: readonly WeightEntry[],
  asOfDate?: string,
): WeightEntry | null {
  const eligible = asOfDate
    ? entries.filter((entry) => entry.date <= asOfDate)
    : entries;
  return sortWeightEntries(eligible).at(-1) ?? null;
}

export function getPreviousWeight(
  entries: readonly WeightEntry[],
  asOfDate?: string,
): WeightEntry | null {
  const sorted = sortWeightEntries(
    asOfDate ? entries.filter((entry) => entry.date < asOfDate) : entries,
  );
  return asOfDate ? sorted.at(-1) ?? null : sorted.at(-2) ?? null;
}

function numericWeight(value: WeightEntry | number): number {
  return typeof value === "number" ? value : value.weightKg ?? value.weight;
}

/** Current minus previous; a negative value means weight loss. */
export function calculateWeightDelta(entries: readonly WeightEntry[]): number | null;
export function calculateWeightDelta(
  current: WeightEntry | number,
  previous?: WeightEntry | number,
): number | null;
export function calculateWeightDelta(
  current: readonly WeightEntry[] | WeightEntry | number,
  previous?: WeightEntry | number,
): number | null {
  if (Array.isArray(current)) {
    const sorted = sortWeightEntries(current);
    if (sorted.length < 2) return null;
    return numericWeight(sorted.at(-1)!) - numericWeight(sorted.at(-2)!);
  }
  if (previous === undefined) return null;
  return numericWeight(current as WeightEntry | number) - numericWeight(previous);
}

export const getWeightDelta = calculateWeightDelta;

/** Positive-only amount lost between two readings. */
export function calculateWeightLoss(
  current: WeightEntry | number,
  previous: WeightEntry | number,
): number {
  return Math.max(0, -(calculateWeightDelta(current, previous) ?? 0));
}

/** Progress toward a lower target, clamped to 0–100. */
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

export function convertWeight(
  value: number,
  from: WeightUnit,
  to: WeightUnit,
): number {
  if (!Number.isFinite(value) || from === to) return value;
  return from === "kg" ? kgToLb(value) : lbToKg(value);
}

export function getUserProgress(
  user: User,
  snapshot: Snapshot,
  currentWeight?: number,
): number {
  const latest =
    currentWeight ??
    getLatestWeight(getUserWeights(user.id, snapshot))?.weightKg ??
    user.goal.startWeightKg;
  return calculateProgress(
    user.goal.startWeightKg,
    user.goal.targetWeightKg,
    latest,
  );
}

/** Number of consecutive calendar-day entries ending at the latest entry. */
export function getLoggingStreak(entries: readonly WeightEntry[]): number {
  if (!entries.length) return 0;
  const days = new Set(entries.map((entry) => entry.date));
  let cursor = sortWeightEntries(entries).at(-1)!.date;
  let streak = 0;

  while (days.has(cursor)) {
    streak += 1;
    const [year, month, day] = cursor.split("-").map(Number);
    const previous = new Date(year, month - 1, day);
    previous.setDate(previous.getDate() - 1);
    cursor = toDateKey(previous);
  }

  return streak;
}

export function getReactionForUser(
  postId: string,
  userId: string | null | undefined,
  snapshot: Snapshot,
): Reaction | null {
  if (!userId) return null;
  return (
    snapshot.reactions.find(
      (reaction) => reaction.postId === postId && reaction.userId === userId,
    ) ?? null
  );
}
