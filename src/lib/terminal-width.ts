export const TERMINAL_WIDTH_DESKTOP = 78;
export const TERMINAL_WIDTH_MOBILE = 44;
export const MOBILE_BREAKPOINT_PX = 640;

export function terminalInner(width: number): number {
  return width - 4;
}
