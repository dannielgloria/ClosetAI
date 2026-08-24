export enum ActivityType {
  HOME = "HOME",
  HOME_OFFICE = "HOME_OFFICE",
  OFFICE = "OFFICE",
  GYM = "GYM",
  RUNNING = "RUNNING",
  CASUAL_OUTING = "CASUAL_OUTING",
  DINNER = "DINNER",
  CASUAL_DINNER = "CASUAL_DINNER",
  DATE = "DATE",
  PARTY = "PARTY",
  FORMAL_EVENT = "FORMAL_EVENT",
  TRAVEL = "TRAVEL",
  WALK = "WALK"
}

export const ACTIVITY_TYPES = Object.values(ActivityType);

export interface ActivityContext {
  type: ActivityType;
  time: string | null;
}

export interface InterpretedContext {
  activities: ActivityContext[];
}

const MAX_ACTIVITIES = 10;
const HH_MM_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function parseInterpretedContext(value: unknown): InterpretedContext {
  if (!isRecord(value) || !Array.isArray(value.activities)) {
    throw new Error("Invalid interpreted context.");
  }

  if (value.activities.length === 0 || value.activities.length > MAX_ACTIVITIES) {
    throw new Error("Invalid activity count.");
  }

  return {
    activities: value.activities.map(parseActivityContext)
  };
}

function parseActivityContext(value: unknown): ActivityContext {
  if (!isRecord(value)) {
    throw new Error("Invalid activity.");
  }

  if (!isActivityType(value.type)) {
    throw new Error("Unknown activity type.");
  }

  if (value.time !== null && (typeof value.time !== "string" || !HH_MM_PATTERN.test(value.time))) {
    throw new Error("Invalid activity time.");
  }

  return {
    type: value.type,
    time: value.time
  };
}

function isActivityType(value: unknown): value is ActivityType {
  return typeof value === "string" && ACTIVITY_TYPES.includes(value as ActivityType);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
