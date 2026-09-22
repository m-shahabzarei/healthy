import type {
  CommunityPost,
  Goal,
  ProgressPhoto,
  Snapshot,
  User,
  WeightEntry,
} from "./types";
import { STORE_VERSION } from "./types";

/** Stable credentials shown in the local demo hint. */
export const DEMO_USER_ID = "user-demo";
export const DEMO_USERNAME = "demo";
export const DEMO_PASSWORD = "healthy123";

const DEMO_GOAL: Goal = {
  startWeightKg: 92,
  targetWeightKg: 82,
  startWeight: 92,
  targetWeight: 82,
  startDate: "2026-09-01",
  targetDate: "2026-12-01",
  unit: "kg",
};

const DEMO_USER: User = {
  id: DEMO_USER_ID,
  username: DEMO_USERNAME,
  displayName: "Sara",
  createdAt: "2026-09-01T07:00:00.000Z",
  goal: DEMO_GOAL,
  startWeight: 92,
  goalWeight: 82,
  targetWeight: 82,
  unit: "kg",
  initials: "S",
  // This is intentionally a demo-only credential. See the README/auth UI
  // before using the project with real users.
  password: DEMO_PASSWORD,
  isDemo: true,
};

const DEMO_WEIGHTS: WeightEntry[] = [
  {
    id: "weight-demo-2026-09-01",
    userId: DEMO_USER_ID,
    date: "2026-09-01",
    weight: 92,
    weightKg: 92,
    value: 92,
    note: "Starting point",
    createdAt: "2026-09-01T07:30:00.000Z",
  },
  {
    id: "weight-demo-2026-09-02",
    userId: DEMO_USER_ID,
    date: "2026-09-02",
    weight: 91.6,
    weightKg: 91.6,
    value: 91.6,
    createdAt: "2026-09-02T07:30:00.000Z",
  },
  {
    id: "weight-demo-2026-09-03",
    userId: DEMO_USER_ID,
    date: "2026-09-03",
    weight: 91.4,
    weightKg: 91.4,
    value: 91.4,
    createdAt: "2026-09-03T07:30:00.000Z",
  },
  {
    id: "weight-demo-2026-09-04",
    userId: DEMO_USER_ID,
    date: "2026-09-04",
    weight: 90.9,
    weightKg: 90.9,
    value: 90.9,
    createdAt: "2026-09-04T07:30:00.000Z",
  },
  {
    id: "weight-demo-2026-09-05",
    userId: DEMO_USER_ID,
    date: "2026-09-05",
    weight: 90.7,
    weightKg: 90.7,
    value: 90.7,
    createdAt: "2026-09-05T07:30:00.000Z",
  },
  {
    id: "weight-demo-2026-09-06",
    userId: DEMO_USER_ID,
    date: "2026-09-06",
    weight: 89.9,
    weightKg: 89.9,
    value: 89.9,
    createdAt: "2026-09-06T07:30:00.000Z",
  },
  {
    id: "weight-demo-2026-09-07",
    userId: DEMO_USER_ID,
    date: "2026-09-07",
    weight: 89.4,
    weightKg: 89.4,
    value: 89.4,
    createdAt: "2026-09-07T07:30:00.000Z",
  },
  {
    id: "weight-demo-2026-09-08",
    userId: DEMO_USER_ID,
    date: "2026-09-08",
    weight: 88.8,
    weightKg: 88.8,
    value: 88.8,
    note: "First week complete",
    createdAt: "2026-09-08T07:30:00.000Z",
  },
];

const DEMO_PHOTOS: ProgressPhoto[] = [
  {
    id: "photo-demo-2026-08-08",
    userId: DEMO_USER_ID,
    date: "2026-08-08",
    takenAt: "2026-08-08",
    dataUrl:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=80",
    imageUrl:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=80",
    url:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=80",
    caption: "First progress photo",
    visibility: "private",
    createdAt: "2026-08-08T10:00:00.000Z",
  },
  {
    id: "photo-demo-2026-09-08",
    userId: DEMO_USER_ID,
    date: "2026-09-08",
    takenAt: "2026-09-08",
    dataUrl:
      "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=900&q=80",
    imageUrl:
      "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=900&q=80",
    url:
      "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=900&q=80",
    caption: "One month, one step forward",
    visibility: "private",
    createdAt: "2026-09-08T10:00:00.000Z",
  },
];

function seedReactions(
  encourage: number,
  celebrate: number,
  fire: number,
) {
  return { encourage, celebrate, fire };
}

const DEMO_POSTS: CommunityPost[] = [
  {
    id: "post-seed-1",
    userId: DEMO_USER_ID,
    type: "weight_loss",
    date: "2026-09-08",
    createdAt: "2026-09-08T08:00:00.000Z",
    body: "I am 3.2 kg lighter this week; steady progress is still progress.",
    copy: "I am 3.2 kg lighter this week; steady progress is still progress.",
    title: "One steady week",
    authorName: "Sara",
    authorInitials: "S",
    metricValue: -3.2,
    metricLabel: "kg lost",
    activityKey: "user-demo:weight-loss:2026-09-08",
    generated: true,
    reactions: seedReactions(8, 4, 3),
  },
  {
    id: "post-seed-2",
    userId: DEMO_USER_ID,
    type: "streak",
    date: "2026-09-07",
    createdAt: "2026-09-07T08:00:00.000Z",
    body: "Seven days of weigh-ins complete. Consistency matters more than any single number.",
    copy: "Seven days of weigh-ins complete. Consistency matters more than any single number.",
    title: "Consistency streak",
    authorName: "Negin",
    authorInitials: "N",
    metricValue: 7,
    metricLabel: "day streak",
    activityKey: "user-demo:streak:7:2026-09-07",
    generated: true,
    reactions: seedReactions(11, 6, 5),
  },
  {
    id: "post-seed-3",
    userId: DEMO_USER_ID,
    type: "goal_milestone",
    date: "2026-09-05",
    createdAt: "2026-09-05T08:00:00.000Z",
    body: "I have completed twenty percent of my goal; small steps add up.",
    copy: "I have completed twenty percent of my goal; small steps add up.",
    title: "A meaningful milestone",
    authorName: "Arman",
    authorInitials: "A",
    metricValue: 20,
    metricLabel: "% of goal",
    activityKey: "user-demo:goal:20:2026-09-05",
    generated: true,
    reactions: seedReactions(6, 9, 2),
  },
];

/**
 * Return a fresh, deterministic snapshot. Never mutate this module-level data
 * directly; callers can safely edit the returned object.
 */
export function createSeedSnapshot(): Snapshot {
  return {
    version: STORE_VERSION,
    currentUser: null,
    currentUserId: null,
    users: JSON.parse(JSON.stringify([DEMO_USER])) as User[],
    weightEntries: JSON.parse(JSON.stringify(DEMO_WEIGHTS)) as WeightEntry[],
    progressPhotos: JSON.parse(JSON.stringify(DEMO_PHOTOS)) as ProgressPhoto[],
    posts: JSON.parse(JSON.stringify(DEMO_POSTS)) as CommunityPost[],
    reactions: [],
  };
}

/** A read-only-ish reference useful for tests and static inspection. */
export const SEED_SNAPSHOT = createSeedSnapshot();
export const seedSnapshot = SEED_SNAPSHOT;
export const initialSnapshot = createSeedSnapshot;
export const createInitialSnapshot = createSeedSnapshot;

export { DEMO_GOAL, DEMO_PHOTOS, DEMO_POSTS, DEMO_USER, DEMO_WEIGHTS };

export default createSeedSnapshot;
