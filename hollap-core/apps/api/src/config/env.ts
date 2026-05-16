import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().default(4001),
  API_BASE_URL: z.string().url().default("http://localhost:4001"),
  CORS_ORIGIN: z.string().default("http://localhost:3001"),
  DATABASE_URL: z
    .string()
    .default("postgresql://postgres:postgres@localhost:5432/hollap_core"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  JWT_ACCESS_SECRET: z.string().default("replace_me_access"),
  JWT_REFRESH_SECRET: z.string().default("replace_me_refresh"),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL: z.string().default("30d"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().optional(),
  APPLE_CLIENT_ID: z.string().optional(),
  APPLE_TEAM_ID: z.string().optional(),
  APPLE_KEY_ID: z.string().optional(),
  APPLE_PRIVATE_KEY: z.string().optional(),
  S3_REGION: z.string().default("us-east-1"),
  S3_BUCKET: z.string().default("hollap-core"),
  S3_ENDPOINT: z.string().default("http://localhost:9000"),
  S3_ACCESS_KEY: z.string().default("minioadmin"),
  S3_SECRET_KEY: z.string().default("minioadmin"),
  S3_FORCE_PATH_STYLE: z
    .string()
    .default("true")
    .transform((value) => value === "true"),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_MOCK: z
    .string()
    .default("true")
    .transform((value) => value === "true"),
  PLATFORM_FEE_PERCENT: z.coerce.number().default(0.1),
  STRIPE_CONNECT_COUNTRY: z.string().default("TR"),
  STRIPE_CONNECT_REFRESH_URL: z.string().optional(),
  STRIPE_CONNECT_RETURN_URL: z.string().optional(),
});

export const env = envSchema.parse(process.env);
export type Env = typeof env;
