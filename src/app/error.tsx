"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
      <h1 className="text-6xl font-teko font-bold text-white mb-4">Error</h1>
      <p className="text-gray-400 text-lg mb-8">
        Something went wrong loading this page.
      </p>
      <button
        onClick={() => reset()}
        className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}
