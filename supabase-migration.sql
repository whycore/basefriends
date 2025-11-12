-- Migration SQL for BaseFriends
-- Run this in Supabase Dashboard -> SQL Editor

-- Create User table
CREATE TABLE IF NOT EXISTS "User" (
    "fid" INTEGER NOT NULL PRIMARY KEY,
    "username" TEXT,
    "displayName" TEXT,
    "pfpUrl" TEXT,
    "followerCount" INTEGER,
    "followingCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Create UserExtra table
CREATE TABLE IF NOT EXISTS "UserExtra" (
    "fid" INTEGER NOT NULL PRIMARY KEY,
    "headline" TEXT,
    "interests" TEXT,
    "skills" TEXT,
    "availability" TEXT,
    "lastSeen" TIMESTAMP(3),
    CONSTRAINT "UserExtra_fid_fkey" FOREIGN KEY ("fid") REFERENCES "User"("fid") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Create Swipe table
CREATE TABLE IF NOT EXISTS "Swipe" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fromFid" INTEGER NOT NULL,
    "toFid" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index on Swipe
CREATE INDEX IF NOT EXISTS "Swipe_fromFid_toFid_idx" ON "Swipe"("fromFid", "toFid");

-- Create FollowCached table
CREATE TABLE IF NOT EXISTS "FollowCached" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fromFid" INTEGER NOT NULL,
    "toFid" INTEGER NOT NULL,
    "status" TEXT,
    "lastCheckedAt" TIMESTAMP(3)
);

-- Create index on FollowCached
CREATE INDEX IF NOT EXISTS "FollowCached_fromFid_toFid_idx" ON "FollowCached"("fromFid", "toFid");

