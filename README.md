# DegenHL - NHL Game Predictions

A data-driven NHL prediction engine that generates daily game picks, puck line spreads, over/under totals, and player prop recommendations.

Live at [degenhl.com](https://degenhl.com)

## How It Works

The prediction model uses a weighted composite score built from NHL stats, injuries, goalie matchups, line combinations, and betting odds. Each game gets a winner prediction with confidence percentage, puck line analysis, over/under projection, and a player prop pick.

Odds are fetched once daily at 9 AM EST via a cron job and cached in the database to minimize API usage.

## Getting Started

### Prerequisites

You need [Node.js](https://nodejs.org/) installed (v20 or later). If you don't have it, download the LTS version from the website and run the installer.

### 1. Clone the repo

```bash
git clone https://github.com/mabthew/nhl-predictions.git
cd nhl-predictions
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Copy the example file and fill in the values. Ask Matt for the credentials if you don't have them.

```bash
cp .env.example .env
```

### 4. Set up the database

This syncs the database schema with Postgres. You only need to run this once, or after schema changes.

```bash
npx prisma db push
```

### 5. Seed the odds cache

The app reads betting odds from a local database cache instead of hitting the API on every page load. You need to populate it before the site will show puck line and player prop data. With the dev server running (next step), open a new terminal and run:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/odds
```

### 6. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the site.
