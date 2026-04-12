import type { MetadataRoute } from "next";
import { getPredictions } from "@/lib/get-predictions";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const data = await getPredictions();

  const gameEntries: MetadataRoute.Sitemap = (data?.predictions ?? []).map(
    (prediction) => ({
      url: `https://degenhl.com/game/${String(prediction.gameId)}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.6,
    })
  );

  return [
    {
      url: "https://degenhl.com",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: "https://degenhl.com/history",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: "https://degenhl.com/methodology",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    ...gameEntries,
  ];
}
