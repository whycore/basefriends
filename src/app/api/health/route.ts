import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getNeynarClient } from "@/lib/neynar";

/**
 * Health check endpoint to diagnose connectivity issues
 * GET /api/health
 */
export async function GET() {
  const health: {
    status: "ok" | "degraded" | "error";
    timestamp: string;
    checks: {
      database: { status: string; error?: string; details?: any };
      neynar: { status: string; error?: string; details?: any };
      environment: { status: string; missing?: string[]; details?: any };
    };
  } = {
    status: "ok",
    timestamp: new Date().toISOString(),
    checks: {
      database: { status: "unknown" },
      neynar: { status: "unknown" },
      environment: { status: "unknown" },
    },
  };

  // Check environment variables
  const requiredEnvVars = ["DATABASE_URL", "NEYNAR_API_KEY"];
  const missingEnvVars: string[] = [];
  const envDetails: Record<string, boolean> = {};

  requiredEnvVars.forEach((varName) => {
    const value = process.env[varName];
    envDetails[varName] = !!value;
    if (!value) {
      missingEnvVars.push(varName);
    }
  });

  if (missingEnvVars.length > 0) {
    health.checks.environment = {
      status: "error",
      missing: missingEnvVars,
      details: envDetails,
    };
    health.status = "error";
  } else {
    health.checks.environment = {
      status: "ok",
      details: envDetails,
    };
  }

  // Check database connection
  const dbUrl = process.env.DATABASE_URL || "";
  const isPostgres = dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://");

  if (isPostgres) {
    try {
      // Test with a simple query
      const count = await prisma.user.count();
      health.checks.database = {
        status: "ok",
        details: {
          type: "postgresql",
          urlPrefix: dbUrl.substring(0, 30) + "...",
          userCount: count,
        },
      };
    } catch (error: any) {
      health.checks.database = {
        status: "error",
        error: error?.message || String(error),
        details: {
          type: "postgresql",
          urlPrefix: dbUrl.substring(0, 30) + "...",
          errorCode: error?.code,
          errorName: error?.name,
        },
      };
      health.status = health.status === "ok" ? "degraded" : "error";
    }
  } else {
    health.checks.database = {
      status: "warning",
      details: {
        type: "not_postgres",
        message: "DATABASE_URL is not a PostgreSQL connection string. Using SQLite or no database.",
        urlPrefix: dbUrl ? dbUrl.substring(0, 30) + "..." : "not_set",
      },
    };
    if (health.status === "ok") {
      health.status = "degraded";
    }
  }

  // Check Neynar API
  try {
    const apiKey = process.env.NEYNAR_API_KEY;
    if (!apiKey) {
      health.checks.neynar = {
        status: "error",
        error: "NEYNAR_API_KEY is not set",
      };
      health.status = "error";
    } else {
      // Test with a simple API call (fetch user with FID 1)
      const client = getNeynarClient();
      try {
        const response = await client.fetchBulkUsers({
          fids: [1],
        });
        
        if (response.users && response.users.length > 0) {
          health.checks.neynar = {
            status: "ok",
            details: {
              apiKeyPrefix: apiKey.substring(0, 8) + "...",
              testUserFid: response.users[0]?.fid,
              testUserUsername: response.users[0]?.username,
            },
          };
        } else {
          health.checks.neynar = {
            status: "warning",
            error: "API call succeeded but returned no users",
            details: {
              apiKeyPrefix: apiKey.substring(0, 8) + "...",
            },
          };
          if (health.status === "ok") {
            health.status = "degraded";
          }
        }
      } catch (apiError: any) {
        health.checks.neynar = {
          status: "error",
          error: apiError?.message || String(apiError),
          details: {
            apiKeyPrefix: apiKey.substring(0, 8) + "...",
            statusCode: apiError?.response?.status,
            statusText: apiError?.response?.statusText,
            errorData: apiError?.response?.data,
          },
        };
        health.status = health.status === "ok" ? "degraded" : "error";
      }
    }
  } catch (error: any) {
    health.checks.neynar = {
      status: "error",
      error: error?.message || String(error),
    };
    health.status = "error";
  }

  const statusCode = health.status === "ok" ? 200 : health.status === "degraded" ? 200 : 500;

  return NextResponse.json(health, { status: statusCode });
}

