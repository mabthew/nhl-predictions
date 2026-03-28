export function getTomorrowDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split("T")[0];
}

export function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

export function formatGameTime(utcString: string): string {
  const date = new Date(utcString);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString + "T12:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function normalize(value: number, min: number, max: number): number {
  if (max === min) return 50;
  return ((value - min) / (max - min)) * 100;
}

export function americanToImpliedProbability(odds: number): number {
  if (odds > 0) {
    return 100 / (odds + 100);
  }
  return Math.abs(odds) / (Math.abs(odds) + 100);
}

export function formatOdds(odds: number): string {
  return odds > 0 ? `+${odds}` : `${odds}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
