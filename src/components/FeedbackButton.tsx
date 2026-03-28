"use client";

import { useState } from "react";

export default function FeedbackButton({ dark }: { dark?: boolean }) {
  const [showModal, setShowModal] = useState(false);
  const [showSecondModal, setShowSecondModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`text-sm font-semibold transition-colors ${
          dark
            ? "text-ice-blue hover:text-white"
            : "text-accent-blue hover:text-charcoal"
        }`}
      >
        Share Your Ideas
      </button>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-xl p-8 max-w-sm mx-4 text-center shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-lg font-bold text-charcoal mb-2">
              Too bad suck eggs 🫵😂
            </p>
            <p className="text-sm text-medium-gray">
              Make your own website then loser
            </p>
            <button
              onClick={() => {
                setShowModal(false);
                setShowSecondModal(true);
              }}
              className="mt-5 px-5 py-2 bg-charcoal text-white text-sm font-semibold rounded-lg hover:bg-charcoal/90 transition-colors"
            >
              Fair enough
            </button>
          </div>
        </div>
      )}

      {showSecondModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowSecondModal(false)}
        >
          <div
            className="bg-white rounded-xl p-8 max-w-sm mx-4 text-center shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm text-medium-gray">
              fr though if you have ideas for tuning or find a bug shoot me a text
            </p>
            <button
              onClick={() => setShowSecondModal(false)}
              className="mt-5 px-5 py-2 bg-charcoal text-white text-sm font-semibold rounded-lg hover:bg-charcoal/90 transition-colors"
            >
              no doubt - you&apos;re a cool guy matt
            </button>
          </div>
        </div>
      )}
    </>
  );
}
