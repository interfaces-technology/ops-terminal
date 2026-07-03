"use client";

import {
  MOBILE_BREAKPOINT_PX,
  TERMINAL_WIDTH_DESKTOP,
  TERMINAL_WIDTH_MOBILE,
} from "@/lib/terminal-width";
import { useSyncExternalStore } from "react";

const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`;

function getTerminalWidth(): number {
  return window.matchMedia(MOBILE_QUERY).matches
    ? TERMINAL_WIDTH_MOBILE
    : TERMINAL_WIDTH_DESKTOP;
}

function subscribe(onStoreChange: () => void): () => void {
  const media = window.matchMedia(MOBILE_QUERY);
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
}

export function useTerminalWidth(): number {
  return useSyncExternalStore(subscribe, getTerminalWidth, () => TERMINAL_WIDTH_MOBILE);
}
