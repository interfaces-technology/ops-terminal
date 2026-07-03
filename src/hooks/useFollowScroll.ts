"use client";

import { useCallback, useEffect, useRef } from "react";

const BOTTOM_THRESHOLD_PX = 80;

function isNearBottom(): boolean {
  return (
    window.scrollY + window.innerHeight >=
    document.documentElement.scrollHeight - BOTTOM_THRESHOLD_PX
  );
}

export function useFollowScroll() {
  const anchorRef = useRef<HTMLDivElement>(null);
  const followRef = useRef(true);

  useEffect(() => {
    const onScroll = () => {
      followRef.current = isNearBottom();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToLatest = useCallback((force = false) => {
    if (!force && !followRef.current) return;

    requestAnimationFrame(() => {
      anchorRef.current?.scrollIntoView({ block: "end" });
    });
  }, []);

  return { anchorRef, scrollToLatest };
}
