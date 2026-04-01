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
      gameOdds: JSON.stringify(gameOdds),
      playerProps: JSON.stringify(playerProps),
      futures: JSON.stringify(futures),
    },
    create: {
      id: "latest",
      gameOdds: JSON.stringify(gameOdds),
      playerProps: JSON.stringify(playerProps),
      futures: JSON.stringify(futures),
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
      gameOdds: JSON.parse(cached.gameOdds) as OddsResponse[],
      playerProps: JSON.parse(cached.playerProps) as OddsResponse[],
      futures: JSON.parse(cached.futures) as FuturesOdds[],
    };
  } catch (error) {
    console.error("Failed to load odds from cache:", error);
    return { gameOdds: [], playerProps: [], futures: [] };
  }
}
