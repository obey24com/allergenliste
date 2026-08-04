import { Redis } from "@upstash/redis";

// Tageslimit für KI-Analysen pro IP. Der Zähler läuft pro Kalendertag
// (Europe/Berlin) und wird in Upstash Redis gespeichert, damit er über alle
// Serverless-Instanzen und Deployments hinweg gilt.
export const AI_DAILY_LIMIT = 3;

export interface QuotaStatus {
  limit: number;
  remaining: number;
  /** Epoch-Millisekunden, ab wann das Kontingent wieder verfügbar ist. */
  resetsAt: number;
}

const BERLIN_TZ = "Europe/Berlin";

const berlinDayStamp = (date: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: BERLIN_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

const secondsUntilBerlinMidnight = (date: Date) => {
  const parts = new Intl.DateTimeFormat("de-DE", {
    timeZone: BERLIN_TZ,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const read = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");

  const elapsed = read("hour") * 3600 + read("minute") * 60 + read("second");
  return Math.max(60, 86_400 - elapsed);
};

const quotaKey = (ip: string, date: Date) => `ai-quota:${ip}:${berlinDayStamp(date)}`;

let redisClient: Redis | null | undefined;

const getRedis = (): Redis | null => {
  if (redisClient !== undefined) {
    return redisClient;
  }

  const url =
    process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL ?? null;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN ?? null;

  redisClient = url && token ? new Redis({ url, token }) : null;
  return redisClient;
};

// In Produktion ohne Redis-Konfiguration wird die Analyse verweigert (Fail-closed),
// damit das Tageslimit nicht durch Deployments/Skalierung umgangen werden kann.
export const isQuotaStoreAvailable = () =>
  getRedis() !== null || process.env.NODE_ENV !== "production";

// Fallback nur für lokale Entwicklung ohne Redis-Env.
const memoryStore = new Map<string, { count: number; resetAt: number }>();

const readMemoryCount = (key: string, now: number) => {
  const entry = memoryStore.get(key);
  if (!entry || entry.resetAt <= now) {
    return 0;
  }
  return entry.count;
};

export async function peekQuota(ip: string): Promise<QuotaStatus> {
  const now = new Date();
  const key = quotaKey(ip, now);
  const resetsAt = now.getTime() + secondsUntilBerlinMidnight(now) * 1000;
  const redis = getRedis();

  const count = redis
    ? Number((await redis.get<number>(key)) ?? 0)
    : readMemoryCount(key, now.getTime());

  return {
    limit: AI_DAILY_LIMIT,
    remaining: Math.max(0, AI_DAILY_LIMIT - count),
    resetsAt,
  };
}

export async function consumeQuota(ip: string): Promise<QuotaStatus> {
  const now = new Date();
  const key = quotaKey(ip, now);
  const ttlSeconds = secondsUntilBerlinMidnight(now);
  const resetsAt = now.getTime() + ttlSeconds * 1000;
  const redis = getRedis();

  let count: number;
  if (redis) {
    count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, ttlSeconds);
    }
  } else {
    count = readMemoryCount(key, now.getTime()) + 1;
    memoryStore.set(key, { count, resetAt: resetsAt });
  }

  return {
    limit: AI_DAILY_LIMIT,
    remaining: Math.max(0, AI_DAILY_LIMIT - count),
    resetsAt,
  };
}
