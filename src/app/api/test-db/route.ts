import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const dbUrl = process.env.DATABASE_URL || "";
    const isPostgres = dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://");
    
    // Test connection
    let connectionTest = "unknown";
    let tableCount = 0;
    
    if (isPostgres) {
      try {
        // Simple query to test connection
        const result = await prisma.$queryRaw`SELECT 1 as test`;
        connectionTest = "connected";
        
        // Count records in Swipe table
        const count = await prisma.swipe.count();
        tableCount = count;
      } catch (e: any) {
        connectionTest = `error: ${e?.message || String(e)}`;
      }
    } else {
      connectionTest = "not_postgres";
    }
    
    return NextResponse.json({
      dbUrlPrefix: dbUrl.substring(0, 30) + "...",
      isPostgres,
      connectionTest,
      tableCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error?.message || String(error),
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

