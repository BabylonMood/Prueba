"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function usePolling<T>(
  url: string,
  intervalMs?: number
): { data: T | null; refresh: () => void } {
  const [reload, setReload] = useState(0);
  const [data, setData] = useState<T | null>(null);
  const inFlight = useRef(false);

  const refresh = useCallback(() => setReload((r) => r + 1), []);

  useEffect(() => {
    if (intervalMs == null) return;

    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (timer == null) {
        timer = setInterval(() => refresh(), intervalMs);
      }
    };
    const stop = () => {
      if (timer != null) {
        clearInterval(timer);
        timer = null;
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        start();
        refresh();
      } else {
        stop();
      }
    };

    if (document.visibilityState === "visible") start();

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      stop();
    };
  }, [intervalMs, refresh]);

  useEffect(() => {
    if (inFlight.current) return;
    inFlight.current = true;
    let cancelled = false;

    fetch(url)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled && json !== null) setData(json as T);
      })
      .catch(() => {})
      .finally(() => {
        inFlight.current = false;
      });

    return () => {
      cancelled = true;
    };
  }, [url, reload]);

  return { data, refresh };
}