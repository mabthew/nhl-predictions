import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { OddsResponse, FuturesOdds } from "./types";

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
