"use client";

import { useMemo } from "react";

interface FooterProps {
  className?: string;
}

export function Footer({ className = "" }: FooterProps) {
  const year = useMemo(() => new Date().getFullYear(), []);
  
  return (
    <footer className={`container mx-auto px-6 mt-16 ${className}`}>
      <hr className="from-border/0 via-border/70 to-border/0 m-0 h-px w-full border-none bg-gradient-to-r" />
      <div className="text-muted-foreground flex h-20 flex-col items-center justify-center text-sm">
        <p className="text-center font-serif text-lg md:text-xl">
          &quot;Originated from Open Source, give back to Open Source.&quot;
        </p>
      </div>
      <div className="text-muted-foreground mb-8 flex flex-col items-center justify-center text-xs">
        <p>Licensed under MIT License</p>
        <p>&copy; {year} IAS_Mind</p>
      </div>
    </footer>
  );
} 