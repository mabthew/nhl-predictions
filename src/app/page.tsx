import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TimeAgo from "@/components/TimeAgo";
import Ticker from "@/components/Ticker";
import WeekView from "@/components/WeekView";
import { getPredictions } from "@/lib/get-predictions";

export const revalidate = 180;

export default async function Home() {
  const data = await getPredictions();

  return (
    <>
      <Header />
      {data && data.predictions.length > 0 && (
        <Ticker predictions={data.predictions} />
      )}

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        {data && (
          <div className="mb-6">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-extrabold text-charcoal uppercase tracking-tight">
                Game Predictions
              </h2>
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-espn-red header-pulse" />
                <span className="text-xs font-semibold uppercase tracking-wider text-medium-gray">
                  Data Feed Live
                </span>
              </div>
            </div>
            <p className="text-sm text-medium-gray mt-1">
              {data.predictions.length} games across{" "}
              {new Set(data.predictions.map((p) => p.gameDate)).size} days
              {" "}&middot;{" "}
              <TimeAgo timestamp={data.generatedAt} />
            </p>
          </div>
        )}

        {data && data.predictions.length > 0 ? (
          <WeekView predictions={data.predictions} />
        ) : (
          <EmptyState />
        )}

      </main>

      <Footer />
    </>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-20">
      <div className="w-20 h-20 bg-border-gray rounded-full mx-auto mb-4 flex items-center justify-center">
        <svg
          className="w-10 h-10 text-medium-gray"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-bold text-charcoal mb-1">
        No Games Scheduled
      </h3>
      <p className="text-sm text-medium-gray">
        Check back later for upcoming NHL game predictions.
      </p>
    </div>
  );
}
