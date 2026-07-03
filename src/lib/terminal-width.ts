export const TERMINAL_WIDTH_DESKTOP = 78;
export const TERMINAL_WIDTH_MOBILE = 44;
export const TERMINAL_WIDTH_MOBILE_MIN = 32;
export const MOBILE_BREAKPOINT_PX = 640;

/** Fallback when DOM measurement is unavailable (SSR / first paint). */
export const MOBILE_CHAR_WIDTH_PX = 8.4;

export function terminalInner(width: number): number {
  return width - 4;
}

export function clampTerminalWidth(width: number): number {
  return Math.max(TERMINAL_WIDTH_MOBILE_MIN, Math.min(width, TERMINAL_WIDTH_DESKTOP));
}
