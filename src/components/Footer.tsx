import Link from "next/link";
import FeedbackButton from "./FeedbackButton";
import OutboundLink from "./OutboundLink";

export default function Footer() {
  return (
    <footer className="bg-charcoal text-medium-gray py-8 text-xs mt-8">
      <div className="max-w-5xl mx-auto px-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 mb-6">
          {/* Navigate */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-white/35 mb-3">
              Navigate
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-white/60 hover:text-white transition-colors">
                  Predictions
                </Link>
              </li>
              <li>
                <Link href="/history" className="text-white/60 hover:text-white transition-colors">
                  History
                </Link>
              </li>
              <li>
                <Link href="/methodology" className="text-white/60 hover:text-white transition-colors">
                  Methodology
                </Link>
              </li>
            </ul>
          </div>

          {/* Data */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-white/35 mb-3">
              Data Sources
            </h4>
            <ul className="space-y-2">
              <li><OutboundLink href="https://api-web.nhle.com" label="NHL API" className="text-white/60 hover:text-white transition-colors">NHL API</OutboundLink></li>
              <li><OutboundLink href="https://the-odds-api.com" label="The Odds API" className="text-white/60 hover:text-white transition-colors">The Odds API</OutboundLink></li>
              <li><OutboundLink href="https://www.cbssports.com/nhl/injuries/" label="CBS Sports Injuries" className="text-white/60 hover:text-white transition-colors">CBS Sports Injuries</OutboundLink></li>
              <li><OutboundLink href="https://www.dailyfaceoff.com/teams" label="Daily Faceoff" className="text-white/60 hover:text-white transition-colors">Daily Faceoff</OutboundLink></li>
            </ul>
          </div>

          {/* Feedback */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-white/35 mb-3">
              Feedback
            </h4>
            <p className="text-white/35 leading-relaxed">
              Got a suggestion or found a bug?
            </p>
            <div className="mt-2">
              <FeedbackButton dark label="Let us know" />
            </div>
            <Link href="/login" className="block mt-4 text-white/25 hover:text-white/50 transition-colors">
              Admin
            </Link>
          </div>
        </div>

        <div className="border-t border-white/10 pt-4 text-center text-white/35">
          NHL Predictions &middot; Powered by NHL API &amp; The Odds API
          &middot; Not betting advice, trust your gut
        </div>
      </div>
    </footer>
  );
}
