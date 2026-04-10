import { createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync } from "crypto";
import { prisma } from "./db";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const SALT = "nhl-predictions-feed-secrets"; // static salt is fine -- key uniqueness comes from AUTH_SECRET

function deriveKey(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is required for encryption");
  return pbkdf2Sync(secret, SALT, 100_000, KEY_LENGTH, "sha256");
}

export function encrypt(plaintext: string): { encrypted: string; iv: string; tag: string } {
  const key = deriveKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    encrypted: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
  };
}

export function decrypt(data: { encrypted: string; iv: string; tag: string }): string {
  const key = deriveKey();
  const decipher = createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(data.iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(data.tag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(data.encrypted, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

export async function saveSecret(envVarName: string, value: string): Promise<void> {
  const { encrypted, iv, tag } = encrypt(value);
  await prisma.feedSecret.upsert({
    where: { envVarName },
    update: { encrypted, iv, tag, vercelSynced: false, updatedAt: new Date() },
    create: { envVarName, encrypted, iv, tag },
  });
}

export async function getSecret(envVarName: string): Promise<string | null> {
  const record = await prisma.feedSecret.findUnique({ where: { envVarName } });
  if (!record) return null;
  return decrypt({ encrypted: record.encrypted, iv: record.iv, tag: record.tag });
}

export async function hasSecret(envVarName: string): Promise<boolean> {
  const count = await prisma.feedSecret.count({ where: { envVarName } });
  return count > 0;
}

// Push a secret to Vercel as an environment variable.
// Returns true on success, false on failure (non-blocking).
export async function pushToVercel(envVarName: string, value: string): Promise<boolean> {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!token || !projectId) {
    console.warn("Vercel sync skipped: VERCEL_TOKEN or VERCEL_PROJECT_ID not set");
    return false;
  }

  const teamQuery = teamId ? `?teamId=${teamId}` : "";
  const baseUrl = `https://api.vercel.com/v10/projects/${projectId}/env${teamQuery}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  try {
    // Try to create first
    const createRes = await fetch(baseUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        key: envVarName,
        value,
        type: "encrypted",
        target: ["production", "preview"],
      }),
    });

    if (createRes.ok) {
      await prisma.feedSecret.update({
        where: { envVarName },
        data: { vercelSynced: true },
      });
      return true;
    }

    // If it already exists, find and update it
    if (createRes.status === 409) {
      const listRes = await fetch(baseUrl, { headers });
      if (!listRes.ok) return false;
      const { envs } = (await listRes.json()) as { envs: Array<{ id: string; key: string }> };
      const existing = envs.find((e) => e.key === envVarName);
      if (!existing) return false;

      const patchUrl = `https://api.vercel.com/v9/projects/${projectId}/env/${existing.id}${teamQuery}`;
      const patchRes = await fetch(patchUrl, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ value, type: "encrypted" }),
      });

      if (patchRes.ok) {
        await prisma.feedSecret.update({
          where: { envVarName },
          data: { vercelSynced: true },
        });
        return true;
      }
    }

    return false;
  } catch (err) {
    console.error("Vercel env sync failed:", err);
    return false;
  }
}
