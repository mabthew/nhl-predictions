import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { OddsResponse, FuturesOdds } from "./types";

export async function saveOddsSnapshot(
  date: string,
  gameOdds: OddsResponse[],
  futures: FuturesOdds[]
): Promise<void> {
  await prisma.oddsSnapshot.upsert({
    where: { snapshotDate: date },
    update: {
      gameOdds: gameOdds as unknown as Prisma.InputJsonValue,
      futures: futures as unknown as Prisma.InputJsonValue,
    },
    create: {
      snapshotDate: date,
      gameOdds: gameOdds as unknown as Prisma.InputJsonValue,
      futures: futures as unknown as Prisma.InputJsonValue,
    },
  });
}

export async function loadOddsSnapshot(
  date: string
): Promise<{ gameOdds: OddsResponse[]; futures: FuturesOdds[] } | null> {
  try {
    const snapshot = await prisma.oddsSnapshot.findUnique({
      where: { snapshotDate: date },
    });
    if (!snapshot) return null;
    return {
      gameOdds: snapshot.gameOdds as unknown as OddsResponse[],
      futures: snapshot.futures as unknown as FuturesOdds[],
    };
  } catch {
    return null;
  }
}

export async function saveOddsToCache(
  gameOdds: OddsResponse[],
  playerProps: OddsResponse[],
  futures: FuturesOdds[]
): Promise<void> {
  await prisma.oddsCache.upsert({
    where: { id: "latest" },
    update: {
      gameOdds: gameOdds as unknown as Prisma.InputJsonValue,
      playerProps: playerProps as unknown as Prisma.InputJsonValue,
      futures: futures as unknown as Prisma.InputJsonValue,
    },
    create: {
      id: "latest",
      gameOdds: gameOdds as unknown as Prisma.InputJsonValue,
      playerProps: playerProps as unknown as Prisma.InputJsonValue,
      futures: futures as unknown as Prisma.InputJsonValue,
    },
  });
}

export async function loadOddsFromCache(): Promise<{
  gameOdds: OddsResponse[];
  playerProps: OddsResponse[];
  futures: FuturesOdds[];
}> {
  try {
    const cached = await prisma.oddsCache.findUnique({
      where: { id: "latest" },
    });

    if (!cached) {
      return { gameOdds: [], playerProps: [], futures: [] };
    }

    return {
      gameOdds: cached.gameOdds as unknown as OddsResponse[],
      playerProps: cached.playerProps as unknown as OddsResponse[],
      futures: cached.futures as unknown as FuturesOdds[],
    };
  } catch (error) {
    console.error("Failed to load odds from cache:", error);
    return { gameOdds: [], playerProps: [], futures: [] };
  }
}
