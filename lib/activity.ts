import type {
  CommunityPost,
  PostType,
  ProgressPhoto,
  Snapshot,
  User,
  WeightEntry,
} from "./types";

/**
 * The small set of automatic events that are allowed to reach the community
 * feed.  Keeping this list explicit is intentional: a weight tracker should
 * celebrate meaningful changes, not publish every noisy edit to a scale
 * reading.
 */
export type ActivityKind = "weight_loss" | "streak" | "goal_milestone" | "photo";

export interface ActivityDraft {
  id?: string;
  userId: string;
  type: ActivityKind | PostType;
  date: string;
  createdAt?: string;
  body?: string;
  copy?: string;
  title?: string;
  text?: string;
  authorName?: string;
  authorInitials?: string;
  metricValue?: number;
  metricLabel?: string;
  activityKey?: string;
  generated?: boolean;
  reactions?: CommunityPost["reactions"];
  /** Friendly aliases useful to callers constructing a draft in tests/UI. */
  kind?: ActivityKind;
  value?: number;
}

export type Activity = CommunityPost;

const LOSS_THRESHOLD_KG = 0.1;
const NUMBER_FORMATTER = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
});

function number(value: number): string {
  return NUMBER_FORMATTER.format(Math.abs(Math.round(value * 10) / 10));
}

function weightOf(entry: WeightEntry): number {
  return Number(entry.weightKg ?? entry.weight);
}

function dateValue(date: string): number {
  const parsed = new Date(`${date}T00:00:00`).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function dayDistance(a: string, b: string): number {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round(Math.abs(dateValue(a) - dateValue(b)) / oneDay);
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : parts[0][0]).toUpperCase();
}

function userFor(snapshot: Snapshot, userId: string): User | null {
  return snapshot.users.find((candidate) => candidate.id === userId) ?? null;
}

function authorFor(snapshot: Snapshot, userId: string): Pick<CommunityPost, "authorName" | "authorInitials"> {
  const user = userFor(snapshot, userId);
  const name = user?.displayName?.trim() || "Healthy member";
  return {
    authorName: name,
    authorInitials: user?.initials || initialsFor(name),
  };
}

function latestWeights(snapshot: Snapshot, userId: string): WeightEntry[] {
  const sorted = snapshot.weightEntries
    .filter((entry) => entry.userId === userId && Number.isFinite(weightOf(entry)))
    .slice()
    .sort((a, b) => dateValue(a.date) - dateValue(b.date) || a.createdAt.localeCompare(b.createdAt));
  // The store normally upserts one reading per day, but de-duplicating here
  // keeps activity generation deterministic for imported/early snapshots too.
  const byDate = new Map<string, WeightEntry>();
  sorted.forEach((entry) => byDate.set(entry.date, entry));
  return Array.from(byDate.values());
}

function eligiblePhotos(snapshot: Snapshot, userId: string): ProgressPhoto[] {
  return snapshot.progressPhotos
      // A missing visibility flag is treated as shareable for backwards
      // compatibility with early snapshots.  The current store normalizes
      // uploaded private photos to `private`, so those remain out of the
      // community stream unless the caller explicitly opts them into `feed`.
      .filter((photo) => photo.userId === userId && photo.visibility !== "private")
      .slice()
      .sort((a, b) => dateValue(a.date) - dateValue(b.date) || a.createdAt.localeCompare(b.createdAt));
}

function existingKeys(snapshot: Snapshot, userId: string): Set<string> {
  return new Set(
    snapshot.posts
      .filter((post) => post.userId === userId && post.activityKey)
      .map((post) => post.activityKey as string),
  );
}

function makePost(
  snapshot: Snapshot,
  draft: Omit<ActivityDraft, "body"> & { body?: string },
): CommunityPost {
  const body = draft.body || formatActivityCopy(draft);
  const author = authorFor(snapshot, draft.userId);
  const createdAt = draft.createdAt || `${draft.date}T12:00:00.000Z`;
  return {
    id: draft.id || `activity-${draft.activityKey || `${draft.userId}-${draft.date}`}`,
    userId: draft.userId,
    type: (draft.type === "milestone" ? "goal_milestone" : draft.type) as CommunityPost["type"],
    date: draft.date,
    createdAt,
    body,
    copy: draft.copy || body,
    title: draft.title,
    text: draft.text || body,
    authorName: draft.authorName || author.authorName,
    authorInitials: draft.authorInitials || author.authorInitials,
    metricValue: draft.metricValue ?? draft.value,
    metricLabel: draft.metricLabel,
    activityKey: draft.activityKey,
    generated: true,
    reactions: draft.reactions || {},
  };
}

/**
 * Turn a generated event into calm, human English copy. Existing copy is
 * respected so seeded/manual posts can pass through this helper unchanged.
 */
export function formatActivityCopy(activity: Partial<ActivityDraft> | CommunityPost): string {
  const existing = activity.copy || activity.body || activity.text;
  if (existing) return existing;

  const kind = ('kind' in activity ? activity.kind : undefined) || activity.type;
  const value = Number(activity.metricValue ?? ('value' in activity ? activity.value : undefined) ?? 0);
  switch (kind) {
    case "weight_loss":
      return `Today I am ${number(value)} kg lighter; steady progress continues.`;
    case "streak":
      return `${number(value)}-day weigh-in streak complete. Consistency beats perfection.`;
    case "goal_milestone":
    case "milestone":
      return `I have lost ${number(value)} kg toward my goal; small steps add up.`;
    case "photo":
      return "I added a new progress photo; small changes deserve to be seen.";
    default:
      return "A new step in the Healthy journey was recorded.";
  }
}

/**
 * Build only the automatic events that are not already represented by a
 * stored activity key.  The feed merges this result with `snapshot.posts`, so
 * old seeded events remain stable while a newly-entered reading appears on
 * the next render without a server.
 *
 * `userId` is optional for the community feed (all users). Passing it is
 * useful for a profile view and keeps the function compatible with the plan's
 * original `buildDailyActivity(snapshot, userId)` contract.
 */
export function buildDailyActivity(snapshot: Snapshot, userId?: string): CommunityPost[] {
  const ids = userId
    ? [userId]
    : Array.from(
        new Set([
          ...snapshot.users.map((user) => user.id),
          ...snapshot.weightEntries.map((entry) => entry.userId),
          ...snapshot.progressPhotos.map((photo) => photo.userId),
        ]),
      );
  const activities: CommunityPost[] = [];

  ids.forEach((id) => {
    const weights = latestWeights(snapshot, id);
    const keys = existingKeys(snapshot, id);
    const emitted = new Set<string>();
    const append = (draft: ActivityDraft) => {
      const key = draft.activityKey;
      if (!key || keys.has(key) || emitted.has(key)) return;
      emitted.add(key);
      activities.push(makePost(snapshot, draft));
    };

    const user = userFor(snapshot, id);
    const start = Number(user?.goal.startWeightKg ?? user?.goal.startWeight ?? 0);
    const target = Number(user?.goal.targetWeightKg ?? user?.goal.targetWeight ?? 0);
    let run = 0;

    weights.forEach((weight, index) => {
      const previous = weights[index - 1];
      const consecutive = Boolean(previous && dayDistance(weight.date, previous.date) === 1);
      run = consecutive ? run + 1 : 1;

      if (previous && consecutive) {
        const rawDelta = weightOf(weight) - weightOf(previous);
        const preciseDelta = Math.round(rawDelta * 100) / 100;
        const delta = round(rawDelta);
        // The UI records tenths of kilograms, so 0.1 is the smallest
        // meaningful loss its users can enter.
        if (preciseDelta <= -LOSS_THRESHOLD_KG) {
          append({
            userId: id,
            type: "weight_loss",
            date: weight.date,
            createdAt: weight.createdAt,
            metricValue: delta,
            metricLabel: "kg lost",
            activityKey: `${id}:weight-loss:${weight.date}`,
            title: "A little lighter",
          });
        }
      }

      if (run >= 7 && run % 7 === 0) {
        append({
          userId: id,
          type: "streak",
          date: weight.date,
          createdAt: weight.createdAt,
          metricValue: run,
          metricLabel: "day streak",
          activityKey: `${id}:streak:${run}:${weight.date}`,
          title: "Consistency streak",
        });
      }

      const current = weightOf(weight);
      const previousWeight = previous ? weightOf(previous) : start;
      // A zero target means the user has not configured a goal yet; do not
      // turn an ordinary reading into a misleading milestone in that case.
      if (start > 0 && target > 0 && start > target && current < start) {
        const reached = Math.floor(start - current + 1e-8);
        const previouslyReached = Math.floor(Math.max(0, start - previousWeight) + 1e-8);
        const milestone = reached > previouslyReached ? reached : 0;
        if (milestone > 0) {
          append({
            userId: id,
            type: "goal_milestone",
            date: weight.date,
            createdAt: weight.createdAt,
            metricValue: milestone,
            metricLabel: "kg lost",
            activityKey: `${id}:goal:${milestone}:${weight.date}`,
            title: "A meaningful milestone",
          });
        }
      }
    });

    const photosByMonth = new Map<string, ProgressPhoto>();
    eligiblePhotos(snapshot, id).forEach((photo) => {
      const month = photo.date.slice(0, 7);
      if (!photosByMonth.has(month)) photosByMonth.set(month, photo);
    });
    photosByMonth.forEach((photo, month) => {
      // One social photo event per calendar month keeps the feed quiet even
      // when a user experiments with several private progress shots.
      append({
        userId: id,
        type: "photo",
        date: photo.date,
        createdAt: photo.createdAt,
        metricLabel: "progress photo",
        activityKey: `${id}:photo:${month}`,
        title: "Visual proof",
      });
    });
  });

  return activities.sort(
    (a, b) => dateValue(b.date) - dateValue(a.date) || b.createdAt.localeCompare(a.createdAt),
  );
}

export default buildDailyActivity;
