export const ENV = {
  jwtSecret: process.env.JWT_SECRET ?? "change-me-in-production",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  adminEmail: process.env.ADMIN_EMAIL ?? "",
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  appUrl: process.env.APP_URL ?? "https://www.considerit-done.com",
};
