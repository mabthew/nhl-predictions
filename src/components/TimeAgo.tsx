"use client";

import { useState, useEffect } from "react";

export default function TimeAgo({ timestamp }: { timestamp: string }) {
  const [text, setText] = useState("");

  useEffect(() => {
    function update() {
      const seconds = Math.floor(
        (Date.now() - new Date(timestamp).getTime()) / 1000
      );
      if (seconds < 60) setText("Updated just now");
      else if (seconds < 3600)
        setText(`Updated ${Math.floor(seconds / 60)} minutes ago`);
      else if (seconds < 86400)
        setText(`Updated ${Math.floor(seconds / 3600)} hours ago`);
      else setText(`Updated ${Math.floor(seconds / 86400)} days ago`);
    }
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [timestamp]);

  return <>{text}</>;
}
