"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";

export default function SetupPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [manualSecret, setManualSecret] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [step, setStep] = useState<"email" | "scan" | "confirm">("email");
  const [loading, setLoading] = useState(false);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to generate secret");
        return;
      }

      const dataUrl = await QRCode.toDataURL(data.uri, { width: 200, margin: 2 });
      setQrDataUrl(dataUrl);
      setManualSecret(data.secret);
      setStep("scan");
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/setup", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Verification failed");
        return;
      }

      router.push("/admin");
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
            Set Up Authenticator
          </h1>
          <p className="text-sm text-medium-gray mb-6">
            {step === "email" && "Enter your admin email to get started."}
            {step === "scan" &&
              "Scan this QR code with Google Authenticator."}
            {step === "confirm" && "Enter the 6-digit code to confirm setup."}
          </p>

          {step === "email" && (
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label
                  htmlFor="setup-email"
                  className="block text-xs font-semibold text-charcoal uppercase tracking-wide mb-1"
                >
                  Email
                </label>
                <input
                  id="setup-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-border-gray px-3 py-2 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  placeholder="you@example.com"
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
                {loading ? "Generating..." : "Generate QR Code"}
              </button>
            </form>
          )}

          {step === "scan" && (
            <div className="space-y-4">
              <div className="flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrDataUrl}
                  alt="TOTP QR Code"
                  width={200}
                  height={200}
                  className="rounded-lg"
                />
              </div>
              <div className="bg-light-gray rounded-lg p-3">
                <p className="text-[11px] text-medium-gray uppercase tracking-wide font-semibold mb-1">
                  Manual entry key
                </p>
                <p className="text-xs font-mono text-charcoal break-all select-all">
                  {manualSecret}
                </p>
              </div>
              <button
                onClick={() => setStep("confirm")}
                className="w-full bg-charcoal text-white text-sm font-bold uppercase tracking-wide rounded-lg py-2.5 hover:bg-charcoal/90 transition-colors"
              >
                I scanned it
              </button>
            </div>
          )}

          {step === "confirm" && (
            <form onSubmit={handleConfirm} className="space-y-4">
              <div>
                <label
                  htmlFor="confirm-code"
                  className="block text-xs font-semibold text-charcoal uppercase tracking-wide mb-1"
                >
                  Enter code from authenticator
                </label>
                <input
                  id="confirm-code"
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
                  autoFocus
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
                {loading ? "Verifying..." : "Confirm Setup"}
              </button>
            </form>
          )}

          <p className="text-xs text-medium-gray text-center mt-4">
            Already set up?{" "}
            <Link
              href="/login"
              className="text-brand-primary font-semibold hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
