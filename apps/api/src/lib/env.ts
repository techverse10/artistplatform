import "dotenv/config";

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  jwtAccessSecret: required("JWT_ACCESS_SECRET", "dev-access-secret"),
  jwtRefreshSecret: required("JWT_REFRESH_SECRET", "dev-refresh-secret"),
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:3000").split(",").map((s) => s.trim()),
  publicApiUrl: process.env.PUBLIC_API_URL ?? "http://localhost:4000",
};
