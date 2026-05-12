import { z } from "zod";

const emptyStringToUndefined = (value: unknown) =>
  value === "" ? undefined : value;

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.string().url(),
  APP_URL: z.string().url(),
  GOOGLE_OAUTH_CLIENT_ID: z.string().min(1),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().min(1),
  GOOGLE_OAUTH_REDIRECT_URI: z.string().url(),
  GSC_TOKEN_ENCRYPTION_KEY: z.string().min(1),
  CRON_SECRET: z.preprocess(
    emptyStringToUndefined,
    z.string().min(16).optional()
  ),
  GSC_SCHEDULED_SYNC_DAYS: z.preprocess(
    emptyStringToUndefined,
    z.coerce.number().int().min(1).max(7).default(1)
  ),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) {
    return cached;
  }

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment variables: ${issues}`);
  }

  cached = parsed.data;
  return cached;
}
