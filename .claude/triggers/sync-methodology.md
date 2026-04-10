# Methodology Page Sync Agent

Sync the methodology page with active paid data feeds.

## What to do

1. Connect to the database and read all rows from the `DataFeed` table where `isActive = true`. You can do this by running: `npx tsx -e "const {PrismaClient}=require('@prisma/client'); const p=new PrismaClient(); p.dataFeed.findMany({where:{isActive:true}}).then(f=>{console.log(JSON.stringify(f,null,2));p.\$disconnect()})"`

2. Read `src/app/methodology/page.tsx` and find the `MODEL_SIGNALS` array and the `PIPELINE` array.

3. Compare active feeds against the signals already listed on the page. Each feed has a `factorKey` — check whether it is covered by an existing signal's narrative or missing entirely. Look for feeds that are active but not documented, or documented but no longer active.

4. If there is a mismatch:
   - For each active feed NOT on the page: either fold it into an existing signal's `body` text if it fits thematically, or add a new entry to `MODEL_SIGNALS` with:
     - `title`: use `factorLabel` from the DataFeed row
     - `icon`: use `methodologyIcon` from the DataFeed row if available, otherwise use "data"
     - `body`: write a narrative paragraph in the same editorial tone as existing signals. Use the feed's `description` field as source material but rewrite it to match the page's voice (direct, knowledgeable, no jargon). Include a note that this is a premium data source. Do NOT include specific weight percentages.
     - `bold`: use `methodologyBold` from the DataFeed row if available, otherwise pick the most important phrase
   - For each feed on the page that is no longer active: remove references to it from the relevant signal's body text, or remove the entire signal entry if it was the only content
   - Update the PIPELINE array's "Data Collection" `sub` to list all data sources including any new paid feeds

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
- Each signal should be a full narrative paragraph, not a one-liner
- Bold one key phrase per signal
- Do NOT include specific weight percentages or ranking (primary/secondary/minor)
- Do not add emojis
