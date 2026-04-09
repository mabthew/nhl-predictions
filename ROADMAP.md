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
