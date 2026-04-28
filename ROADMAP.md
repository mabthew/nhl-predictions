## Betting Features

- ~~**Puck line confidence** - Show confidence scores for puck line picks, not just winner predictions~~
- ~~**Best bet of the day** - Surface the highest-confidence pick weighted by payout potential~~
- ~~**3-leg parlay builder** - Generate a recommended 3-leg parlay from the day's best picks~~
- **Risk modes** - Let users choose conservative, moderate, or aggressive parlay strategies

## Data Sources

- **Paid feed adapters** - Build per-feed parsers for the three seeded feeds (MoneyPuck xG, Action Network line movement, Historical Odds). The plugin system is deployed but feeds need real API adapters before activation.
- **MoneyPuck xG adapter** - Parse CSV data, map to per-team expected goals metric. Lowest complexity, highest expected accuracy lift.
- **Historical odds import** - Bulk import closing lines for retroactive backtesting across all models.
- **Action Network adapter** - Sharp money / line movement signals. Highest cost, most complex auth.
- **Elite Prospects integration** - Pull prospect and player development data from Elite Prospects
- **NHL Edge tracking data** - Integrate skating speed, shot speed, and other tracking metrics from nhl.com/nhl-edge

## Paid Feeds Infrastructure

- **Inline feed activation** - Add toggle buttons next to inactive feeds so they can be activated directly from the model builder without accessing the database
- **Admin feed management UI** - Toggle feeds on/off from the dashboard instead of raw DB updates
- **Per-feed accuracy tracking** - Measure how much each paid feed actually improves predictions vs baseline
- **Feed cost breakdown on costs page** - Show per-feed daily/monthly spend from ApiUsageLog
- **Normalization tuning** - Analyze real data distributions and update leagueAvg/leagueSd in DataFeed rows

## Admin Dashboard

- ~~**Engagement metrics** - Track page views, returning users, and feature usage~~
- ~~**Cost monitoring** - Surface API usage costs (Odds API, Neon, Vercel) in the admin panel~~
- ~~**Model builder** - Let admins chat with an LLM to define new prediction models by adjusting factor weights and adding new signals~~

## Public Site

- **Obscure methodology** - Replace the detailed weight breakdown with a brief synopsis of what the model does and why it works, without revealing the composition. Show the "what" not the "how."
- **Live accuracy tracker** - Show a running season record prominently on the homepage. Bettors care about track record more than methodology.
- **Closing line value tracking** - Compare the model's pick at time of publication vs the closing line. CLV is the gold standard for measuring real predictive edge.
- **Bet grading** - After games finish, grade each prediction against the closing line. Did the model beat the market, or just pick favorites?

## Betting Features (continued)

- **Bankroll simulator** - Show "if you'd bet $100 on every pick this season, here's your P&L." Makes the value proposition tangible.
- **Streak alerts** - Surface when a team is significantly over/under-performing the model. Regression spots sharp bettors look for.

## Data Signals

- **Schedule strength adjustment** - A 7-3 last-10 against bottom feeders means less than 7-3 against playoff teams.
- **Divisional rivalry factor** - Teams play differently in divisional matchups, especially late season with playoff positioning at stake.

## Admin Dashboard (continued)

- **Model leaderboard** - Compare all custom models' accuracy over rolling windows side by side.
- **Post-merge accuracy regression** - After merging a new feed or model change, automatically backtest the last 30 days and compare to before.

## Engagement

- **Daily email digest** - Top 3 picks with confidence, delivered at noon ET before puck drop.
- **Embed widget** - A small JS widget other hockey sites could embed showing today's top pick.
- **Public API** - Let people build on top of the predictions.

## Social and Distribution

- **X/Twitter presence** - Build a voice and posting cadence, engage with hockey betting community (@odybrownbets, @spittinchiclets)
- **Instagram** - Visual game cards and pick summaries for Instagram stories and posts

## Content Hub

- **Author identity system** - Lightweight `Author` model (handle, displayName, avatarUrl, kind: human or bot, bio). Seed two authors to start: your personal handle and `@botANALysis`. Defer public user accounts to the paywall milestone.
- **Article CMS** - `Article` model (authorId, slug, title, body markdown, status draft or published, publishedAt, coverImage, tags). Admin editor at `/admin/articles`. Public list at `/analysis` and detail at `/analysis/[slug]`.
- **Bot analyst pipeline (@botANALysis)** - RSS-based scraper pulls NHL headlines from a curated source list, sends scrape plus current-day model picks to Claude (reuse `@anthropic-ai/claude-agent-sdk`), writes a draft Article authored by the bot. Admin reviews in `/admin/articles` and publishes. Runs on a cron at 7 AM and 5 PM ET to match the existing daily cycle.
- **Voice guardrails** - Enforce the voice rules from AGENTS.md and memory in the bot prompt: direct and knowledgeable tone, no emdashes, no acronyms, full stat and team names.

## Season Record Expansion

- **Closing line value per category** - Tie the CLV work already on this roadmap to the new season record card so each row (spread, over/under, player props) carries a CLV column.
- **All-time vs current season toggle** - Switch between the current season and lifetime record on the homepage card.
- **Per-model record breakdown** - Surface the active model's record alongside the ensemble so readers see whether the current build is keeping pace.

## Affiliate and Partner Infrastructure

- **Partner model** - `Partner` Prisma model (name, logo, slug, utmSource, revenueShareBps, notes).
- **Outbound attribution** - Extend `EngagementEvent.metadata` or add a dedicated `OutboundClick` model once volume justifies it. Capture partner, campaign, and placement for every click.
- **Partner landing links** - `/go/[partner]` server route that records the click server-side and redirects to the partner URL with the correct UTM parameters. Safer than client-side tracking because ad blockers cannot strip it.
- **Revenue reconciliation** - Admin dashboard that reconciles clicks to conversions once partners send back reports (weekly CSV to start).

## Social Auto-Posting

- **SocialPost model** - (platform, content, scheduledFor, postedAt, externalId, articleId). Used to prevent duplicate posts and to track what went out.
- **Poster cron** - `src/app/api/cron/social/route.ts`. Pulls the day's top pick and any newly published article, posts to X first via the Twitter API v2. Instagram and Discord follow once the X pipeline is stable.
- **Secrets** - Add `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_SECRET` to Vercel env.

## Multi-Sport (Degen Sports umbrella)

- **Sport abstraction** - Add `sport` column to `PredictionRecord`, `OddsCache`, `DataFeed`, `ModelConfig`, `FeedCache`. Parameterize API route paths: `/api/[sport]/predictions`, `/api/[sport]/record`, etc.
- **League configuration layer** - Per-sport `leagueAverages`, `leagueSd`, and stat-type whitelists in a config module instead of the hardcoded NHL constants currently in `src/lib/predictor.ts`.
- **SportAdapter interface** - Factor `src/lib/nhl-api.ts` behind a `SportAdapter` contract so NFL and NBA adapters slot in without touching the core predictor or history sync.
- **Umbrella site** - `degensports.com` renders the parent brand and sport sub-brands (DegeNHL, DegeNFL, DegeNBA) render from shared components with sport-specific data.
- **Consumer auth** - Add Clerk via the Vercel Marketplace (fits the existing Vercel stack cleanly). Keeps admin TOTP separate from public user accounts.
- **Paywall and packaging** - Stripe for subscriptions. Packages are a la carte per sport; 2-sport and 3-sport bundles unlock progressively better pricing.
- **Build order** - (1) refactor NHL onto the Sport abstraction, (2) ship consumer auth plus paywall on NHL alone, (3) clone for NFL in time for September, (4) NBA follows NFL.
