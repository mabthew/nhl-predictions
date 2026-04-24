"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/admin";

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Login failed");
        return;
      }

      router.push(redirect);
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-light-gray flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-xl border border-border-gray p-6">
          <h1 className="font-teko text-2xl font-bold text-charcoal uppercase tracking-tight mb-1">
            Admin Login
          </h1>
          <p className="text-sm text-medium-gray mb-6">
            Enter your admin email and authenticator code.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-charcoal uppercase tracking-wide mb-1"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-border-gray px-3 py-2 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-brand-primary"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="code"
                className="block text-xs font-semibold text-charcoal uppercase tracking-wide mb-1"
              >
                Authenticator Code
              </label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                className="w-full rounded-lg border border-border-gray px-3 py-2 text-sm text-charcoal tracking-[0.3em] font-mono focus:outline-none focus:ring-2 focus:ring-brand-primary"
                placeholder="000000"
              />
            </div>

            {error && (
              <p className="text-sm text-brand-primary font-semibold">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-charcoal text-white text-sm font-bold uppercase tracking-wide rounded-lg py-2.5 hover:bg-charcoal/90 disabled:opacity-50 transition-colors"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="text-xs text-medium-gray text-center mt-4">
            First time?{" "}
            <Link
              href="/login/setup"
              className="text-brand-primary font-semibold hover:underline"
            >
              Set up authenticator
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
