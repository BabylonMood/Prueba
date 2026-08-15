"use client";

import { useCallback, useEffect, useState } from "react";

export function usePolling<T>(
  url: string,
  intervalMs?: number
): { data: T | null; refresh: () => void } {
  const [reload, setReload] = useState(0);
  const [data, setData] = useState<T | null>(null);

  const refresh = useCallback(() => setReload((r) => r + 1), []);

  useEffect(() => {
    if (intervalMs == null) return;
    const timer = setInterval(() => setReload((r) => r + 1), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  useEffect(() => {
    let cancelled = false;
    fetch(url)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled && json !== null) setData(json as T);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [url, reload]);

  return { data, refresh };
}
