import { PrismaClient } from "@/app/generated/prisma";
import { Pool } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";

// Singleton pattern to prevent multiple instances in development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Create NeonDB connection pool
const createPrismaClient = () => {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL environment variable is not set. Please check your .env.local file."
    );
  }

  // Create connection pool for serverless environments
  const pool = new Pool({ connectionString });

  // Create Prisma adapter with NeonDB pool
  const adapter = new PrismaNeon(pool);

  // Initialize Prisma Client with the adapter
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
};

// Export singleton instance
export const db = globalForPrisma.prisma ?? createPrismaClient();

// In development, attach to global to prevent hot-reload issues
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
