"use client";

import {
  clampTerminalWidth,
  MOBILE_BREAKPOINT_PX,
  MOBILE_CHAR_WIDTH_PX,
  TERMINAL_WIDTH_DESKTOP,
  TERMINAL_WIDTH_MOBILE,
} from "@/lib/terminal-width";
import { useSyncExternalStore } from "react";

const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`;

let cachedCharWidthPx: number | null = null;

function measureCharWidthPx(): number {
  if (cachedCharWidthPx !== null) return cachedCharWidthPx;

  const probe = document.createElement("span");
  probe.setAttribute("aria-hidden", "true");
  probe.className = "font-mono text-sm";
  probe.style.cssText =
    "position:absolute;left:-9999px;visibility:hidden;white-space:nowrap;pointer-events:none;";
  probe.textContent = "0".repeat(20);
  document.body.appendChild(probe);
  cachedCharWidthPx = probe.getBoundingClientRect().width / 20;
  probe.remove();

  return cachedCharWidthPx || MOBILE_CHAR_WIDTH_PX;
}

function getShellHorizontalPaddingPx(): number {
  const shell = document.querySelector(".terminal-shell");
  if (!shell) return 24;

  const style = getComputedStyle(shell);
  return parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
}

function getMobileTerminalWidth(): number {
  const charWidth = measureCharWidthPx();
  const padding = getShellHorizontalPaddingPx();
  const available = window.innerWidth - padding;

  return clampTerminalWidth(Math.floor(available / charWidth));
}

function getTerminalWidth(): number {
  return window.matchMedia(MOBILE_QUERY).matches
    ? getMobileTerminalWidth()
    : TERMINAL_WIDTH_DESKTOP;
}

function subscribe(onStoreChange: () => void): () => void {
  const media = window.matchMedia(MOBILE_QUERY);

  const onChange = () => {
    cachedCharWidthPx = null;
    onStoreChange();
  };

  media.addEventListener("change", onChange);
  window.addEventListener("resize", onChange);
  window.addEventListener("orientationchange", onChange);

  return () => {
    media.removeEventListener("change", onChange);
    window.removeEventListener("resize", onChange);
    window.removeEventListener("orientationchange", onChange);
  };
}

export function useTerminalWidth(): number {
  return useSyncExternalStore(subscribe, getTerminalWidth, () => TERMINAL_WIDTH_MOBILE);
}
