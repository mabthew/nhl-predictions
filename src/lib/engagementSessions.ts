export interface SessionInputEvent {
  visitorId: string;
  deviceHash: string | null;
  createdAt: Date;
}

export interface SessionStats {
  total: number;
  avgPagesPerSession: number;
  bounceRate: number;
}

const SESSION_GAP_MS = 30 * 60 * 1000;

export function computeSessionStats(events: SessionInputEvent[]): SessionStats {
  if (events.length === 0) {
    return { total: 0, avgPagesPerSession: 0, bounceRate: 0 };
  }

  const byKey = new Map<string, SessionInputEvent[]>();
  for (const e of events) {
    const key = e.deviceHash ?? `v:${e.visitorId}`;
    const bucket = byKey.get(key);
    if (bucket) bucket.push(e);
    else byKey.set(key, [e]);
  }

  let totalSessions = 0;
  let totalPageviews = 0;
  let bounceSessions = 0;

  for (const bucket of byKey.values()) {
    bucket.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    let sessionLength = 0;
    let lastTime = 0;
    for (const e of bucket) {
      const t = e.createdAt.getTime();
      if (lastTime === 0 || t - lastTime > SESSION_GAP_MS) {
        if (sessionLength > 0) {
          totalSessions += 1;
          totalPageviews += sessionLength;
          if (sessionLength === 1) bounceSessions += 1;
        }
        sessionLength = 1;
      } else {
        sessionLength += 1;
      }
      lastTime = t;
    }
    if (sessionLength > 0) {
      totalSessions += 1;
      totalPageviews += sessionLength;
      if (sessionLength === 1) bounceSessions += 1;
    }
  }

  return {
    total: totalSessions,
    avgPagesPerSession: totalSessions > 0 ? totalPageviews / totalSessions : 0,
    bounceRate: totalSessions > 0 ? bounceSessions / totalSessions : 0,
  };
}
