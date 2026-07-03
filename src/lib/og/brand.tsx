import type { ReactNode } from "react";
import {
  SITE_BRAND_GREEN,
  SITE_BRAND_GREEN_LIGHT,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_THEME_COLOR,
} from "@/lib/site";

const MONO = "ui-monospace, monospace";

type BrandFrameProps = {
  children: ReactNode;
  borderWidth?: number;
  padding?: string;
};

export function BrandFrame({
  children,
  borderWidth = 2,
  padding,
}: BrandFrameProps) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: SITE_THEME_COLOR,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: `${borderWidth}px solid ${SITE_BRAND_GREEN}`,
          padding,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function FaviconMark() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: SITE_THEME_COLOR,
        border: `2px solid ${SITE_BRAND_GREEN}`,
      }}
    >
      <span
        style={{
          color: SITE_BRAND_GREEN,
          fontSize: 20,
          fontFamily: MONO,
          fontWeight: 700,
          marginTop: -2,
        }}
      >
        &gt;
      </span>
    </div>
  );
}

export function AppleIconMark() {
  return (
    <BrandFrame borderWidth={3} padding="28px 36px">
      <span
        style={{
          color: SITE_BRAND_GREEN,
          fontSize: 52,
          fontFamily: MONO,
          fontWeight: 700,
          letterSpacing: "0.08em",
        }}
      >
        OPS
      </span>
    </BrandFrame>
  );
}

export function OpenGraphMark() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: SITE_THEME_COLOR,
        padding: 64,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          border: `3px solid ${SITE_BRAND_GREEN}`,
          padding: "48px 72px",
          gap: 24,
        }}
      >
        <span
          style={{
            color: SITE_BRAND_GREEN,
            fontSize: 72,
            fontFamily: MONO,
            fontWeight: 700,
            letterSpacing: "0.12em",
          }}
        >
          {SITE_NAME.toUpperCase()}
        </span>
        <span
          style={{
            color: SITE_BRAND_GREEN_LIGHT,
            fontSize: 32,
            fontFamily: MONO,
            letterSpacing: "0.04em",
          }}
        >
          {SITE_TAGLINE}
        </span>
      </div>
    </div>
  );
}
