import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page Not Found | DegenHL",
};

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
      <h1 className="text-6xl font-teko font-bold text-white mb-4">404</h1>
      <p className="text-gray-400 text-lg mb-8">
        This page doesn&apos;t exist.
      </p>
      <Link
        href="/"
        className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
      >
        Back to Predictions
      </Link>
    </div>
  );
}
