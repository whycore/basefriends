import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Helper to check if DATABASE_URL is for connection pooler
function getDatabaseUrl(): string {
  const dbUrl = process.env.DATABASE_URL || "";
  
  // If it's a Supabase connection string, ensure it has pgbouncer parameter
  if (dbUrl.includes("supabase.co") && !dbUrl.includes("pgbouncer=true") && !dbUrl.includes("?")) {
    // Add pgbouncer parameter for connection pooler compatibility
    return `${dbUrl}?pgbouncer=true`;
  }
  
  return dbUrl;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error", "warn"],
    // Disable prepared statements for connection pooler compatibility
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}


