import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const updated = await prisma.dataFeed.update({
    where: { slug: "moneypuck-xg" },
    data: {
      endpoint:
        "https://moneypuck.com/moneypuck/playerData/seasonSummary/{year}/regular/teams.csv",
    },
  });
  console.log("Updated feed:", updated.slug, "→", updated.endpoint);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
