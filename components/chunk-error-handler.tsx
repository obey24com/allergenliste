"use client";

import { useEffect } from "react";

const RELOAD_THROTTLE_KEY = "gastrohelper-last-chunk-reload";
const RELOAD_THROTTLE_WINDOW_MS = 30_000;

const toMessage = (value: unknown): string => {
  if (typeof value === "string") {
    return value;
  }

  if (value instanceof Error) {
    return value.message;
  }

  if (value && typeof value === "object" && "message" in value) {
    const message = (value as { message?: unknown }).message;
    return typeof message === "string" ? message : "";
  }

  return "";
};

const isChunkLoadError = (value: unknown) => {
  const message = toMessage(value);
  return /ChunkLoadError|Loading chunk [\w-]+ failed|Failed to fetch dynamically imported module/i.test(
    message
  );
};

const shouldReloadNow = () => {
  try {
    const now = Date.now();
    const lastReloadValue = sessionStorage.getItem(RELOAD_THROTTLE_KEY);
    const lastReload = lastReloadValue ? Number(lastReloadValue) : 0;

    if (Number.isFinite(lastReload) && now - lastReload < RELOAD_THROTTLE_WINDOW_MS) {
      return false;
    }

    sessionStorage.setItem(RELOAD_THROTTLE_KEY, String(now));
    return true;
  } catch {
    return true;
  }
};

export function ChunkErrorHandler() {
  useEffect(() => {
    const reloadOnChunkError = () => {
      if (!shouldReloadNow()) {
        return;
      }
      window.location.reload();
    };

    const onWindowError = (event: ErrorEvent) => {
      if (isChunkLoadError(event.error ?? event.message)) {
        reloadOnChunkError();
      }
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (isChunkLoadError(event.reason)) {
        reloadOnChunkError();
      }
    };

    window.addEventListener("error", onWindowError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.removeEventListener("error", onWindowError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}
