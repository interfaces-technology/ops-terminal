"use client";

import { useCallback, useEffect, useRef } from "react";

const BOTTOM_THRESHOLD_PX = 80;

function isNearBottom(): boolean {
  return (
    window.scrollY + window.innerHeight >=
    document.documentElement.scrollHeight - BOTTOM_THRESHOLD_PX
  );
}

function scrollToPageEnd(): void {
  window.scrollTo(0, document.documentElement.scrollHeight);
}

export function useFollowScroll() {
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
      scrollToPageEnd();
    });
  }, []);

  return { scrollToLatest };
}
