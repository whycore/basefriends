import { prisma } from "@/lib/prisma";

/**
 * Store a signer for a given FID
 */
export async function storeSigner(
  fid: number,
  signerUuid: string,
  publicKey?: string,
  expiresAt?: Date
): Promise<void> {
  await prisma.signer.upsert({
    where: { fid },
    update: {
      signerUuid,
      publicKey: publicKey || undefined,
      status: "active",
      expiresAt: expiresAt || null,
      updatedAt: new Date(),
    },
    create: {
      fid,
      signerUuid,
      publicKey: publicKey || undefined,
      status: "active",
      expiresAt: expiresAt || null,
    },
  });
}

/**
 * Get active signer for a given FID
 */
export async function getSigner(fid: number): Promise<{
  signerUuid: string;
  publicKey?: string | null;
  status: string;
} | null> {
  const signer = await prisma.signer.findUnique({
    where: { fid },
  });

  if (!signer || signer.status !== "active") {
    return null;
  }

  // Check if expired
  if (signer.expiresAt && signer.expiresAt < new Date()) {
    // Mark as expired
    await prisma.signer.update({
      where: { fid },
      data: { status: "expired" },
    });
    return null;
  }

  return {
    signerUuid: signer.signerUuid,
    publicKey: signer.publicKey,
    status: signer.status,
  };
}

/**
 * Revoke a signer (mark as revoked)
 */
export async function revokeSigner(fid: number): Promise<void> {
  await prisma.signer.updateMany({
    where: { fid, status: "active" },
    data: { status: "revoked", updatedAt: new Date() },
  });
}

