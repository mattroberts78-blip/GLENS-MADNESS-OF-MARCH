"use client";

import { useEffect, useState } from "react";

type Remaining = {
  totalMs: number;
  hours: number;
  minutes: number;
  seconds: number;
};

// 2026-03-19T11:15:00 CDT == 2026-03-19T16:15:00Z
const TARGET_TIME = new Date("2026-03-19T16:15:00Z").getTime();

function getRemaining(): Remaining {
  const now = Date.now();
  const totalMs = TARGET_TIME - now;
  const clamped = Math.max(totalMs, 0);
  const totalSeconds = Math.floor(clamped / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { totalMs, hours, minutes, seconds };
}

export function Countdown() {
  const [remaining, setRemaining] = useState<Remaining>(() => getRemaining());

  useEffect(() => {
    if (remaining.totalMs <= 0) return;
    const id = setInterval(() => {
      setRemaining(getRemaining());
    }, 1000);
    return () => clearInterval(id);
  }, [remaining.totalMs]);

  if (remaining.totalMs <= 0) {
    return (
      <div className="countdown-banner countdown-banner-locked">
        Brackets are locked.
      </div>
    );
  }

  const pad = (n: number) => n.toString().padStart(2, "0");

  return (
    <div className="countdown-banner">
      Brackets lock in {pad(remaining.hours)}:{pad(remaining.minutes)}:
      {pad(remaining.seconds)} (11:15&nbsp;CDT)
    </div>
  );
}

