# Methodology Page Sync Agent

Sync the methodology page with active paid data feeds.

## What to do

1. Connect to the database and read all rows from the `DataFeed` table where `isActive = true`. You can do this by running: `npx tsx -e "const {PrismaClient}=require('@prisma/client'); const p=new PrismaClient(); p.dataFeed.findMany({where:{isActive:true}}).then(f=>{console.log(JSON.stringify(f,null,2));p.\$disconnect()})"`

2. Read `src/app/methodology/page.tsx` and find the factor arrays: `PRIMARY_FACTORS`, `SUPPORTING_FACTORS`, `MINOR_FACTORS`, and the `PIPELINE` array.

3. Compare active feeds against the factors already listed on the page. Each feed has a `factorKey` that should match an entry in one of the arrays. Look for feeds that are active but not documented, or documented but no longer active.

4. If there is a mismatch:
   - For each active feed NOT on the page: add it to `MINOR_FACTORS` with:
     - `pct`: use the dynamic weight percentage from any saved custom model that uses this feed, or estimate 3-5%
     - `label`: use `factorLabel` from the DataFeed row
     - `desc`: write a one-sentence description in the same editorial tone as existing factors. Use the feed's `description` field as source material but rewrite it to match the page's voice (direct, knowledgeable, no jargon). Include a note that this is a premium data source.
     - `bold`: use `methodologyBold` from the DataFeed row if available, otherwise pick the most important phrase
     - `icon`: use `methodologyIcon` from the DataFeed row if available, otherwise use "data"
   - For each feed on the page that is no longer active: remove it from the factor array
   - Update the PIPELINE array:
     - "Data Collection" `sub` should list all data sources including any new paid feeds
     - "Factor Scoring" `sub` should say "N weighted metrics" where N is 12 + number of active paid feeds

5. If the page content matches active feeds (no mismatch), do nothing and report "Methodology page is in sync."

6. If changes were made:
   - Create a new branch: `methodology-sync-YYYY-MM-DD`
   - Commit with message: "Sync methodology page with active data feeds"
   - Push and create a PR with title "Sync methodology with active feeds" and body listing what changed

## Writing guidelines

Follow the existing writing style on the methodology page:
- Use full team names, never abbreviations
- No emdashes
- Direct, knowledgeable tone
- Each factor description should be 1-2 sentences
- Bold one key phrase per description
- Do not add emojis
