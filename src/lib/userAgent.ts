export type DeviceType = "mobile" | "tablet" | "desktop" | "bot";

export interface UserAgentInfo {
  device: DeviceType;
  browser: string;
}

export function classifyUserAgent(ua: string | null | undefined): UserAgentInfo {
  if (!ua) return { device: "desktop", browser: "Unknown" };

  if (/bot|crawl|spider|slurp|bingpreview|facebookexternalhit|linkedinbot|discordbot|twitterbot|whatsapp|telegrambot|headlesschrome|lighthouse|gptbot|chatgpt|claudebot|perplexity/i.test(ua)) {
    return { device: "bot", browser: detectBrowser(ua) };
  }

  const isTablet = /iPad|Tablet|PlayBook|Silk/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua));
  if (isTablet) return { device: "tablet", browser: detectBrowser(ua) };

  if (/Mobile|iPhone|iPod|Android.*Mobile|Opera Mini|IEMobile|Windows Phone/i.test(ua)) {
    return { device: "mobile", browser: detectBrowser(ua) };
  }

  return { device: "desktop", browser: detectBrowser(ua) };
}

function detectBrowser(ua: string): string {
  if (/Edg\//i.test(ua)) return "Edge";
  if (/OPR\/|Opera/i.test(ua)) return "Opera";
  if (/Firefox\//i.test(ua)) return "Firefox";
  if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) return "Chrome";
  if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) return "Safari";
  if (/MSIE|Trident\//i.test(ua)) return "Internet Explorer";
  return "Other";
}
