// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { resetStore } from "~/core/store";

export function RouteChangeHandler() {
  const pathname = usePathname();
  const previousPathname = useRef<string | null>(null);

  useEffect(() => {
    // Only reset if we're actually changing routes (not on initial load)
    if (previousPathname.current && previousPathname.current !== pathname) {
      // Reset store state when changing between different agent pages
      const agentPages = ["/chatbot", "/deep_research", "/reports"];
      const isFromAgentPage = agentPages.some(page => 
        previousPathname.current?.startsWith(page)
      );
      const isToAgentPage = agentPages.some(page => 
        pathname.startsWith(page)
      );
      
      if (isFromAgentPage || isToAgentPage) {
        resetStore();
      }
    }
    
    previousPathname.current = pathname;
  }, [pathname]);

  return null;
} 