import Link from "next/link";
import FeedbackButton from "./FeedbackButton";

export default function Footer() {
  return (
    <footer className="bg-charcoal text-medium-gray py-8 text-xs mt-8">
      <div className="max-w-5xl mx-auto px-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 mb-6">
          {/* Navigate */}
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-3">
              Navigate
            </h4>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-white/50 hover:text-white transition-colors">
                  Predictions
                </Link>
              </li>
              <li>
                <Link href="/history" className="text-white/50 hover:text-white transition-colors">
                  History
                </Link>
              </li>
              <li>
                <Link href="/methodology" className="text-white/50 hover:text-white transition-colors">
                  Methodology
                </Link>
              </li>
            </ul>
          </div>

          {/* Data */}
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-3">
              Data Sources
            </h4>
            <ul className="space-y-2">
              <li className="text-white/40">NHL API</li>
              <li className="text-white/40">The Odds API</li>
              <li className="text-white/40">CBS Sports Injuries</li>
            </ul>
          </div>

          {/* Feedback */}
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-3">
              Feedback
            </h4>
            <p className="text-white/40 leading-relaxed">
              Got a suggestion or found a bug?
            </p>
            <div className="mt-2">
              <FeedbackButton dark />
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-4 text-center text-white/30">
          NHL Predictions &middot; Powered by NHL API &amp; The Odds API
          &middot; Not betting advice, trust your gut
        </div>
      </div>
    </footer>
  );
}
