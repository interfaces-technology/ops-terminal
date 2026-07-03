"use client";

import { TerminalLoader } from "@/components/TerminalLoader";
import { LOADER_MIN_MS } from "@/lib/loader-phases";
import { useEffect, useState, type ReactNode } from "react";

interface TerminalGateProps {
  children: ReactNode;
}

export function TerminalGate({ children }: TerminalGateProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), LOADER_MIN_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!ready) {
    return <TerminalLoader />;
  }

  return children;
}
