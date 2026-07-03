import { ImageResponse } from "next/og";
import { OpenGraphMark } from "@/lib/og/brand";
import { SITE_NAME } from "@/lib/site";

export const alt = `${SITE_NAME} — ASCII ops dashboard`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function TwitterImage() {
  return new ImageResponse(<OpenGraphMark />, { ...size });
}
