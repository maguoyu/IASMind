// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

"use client";

import { usePathname } from "next/navigation";

import { ThemeProvider } from "~/components/theme-provider";

export function ThemeProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isThemeSwitchablePage = true;

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme={"dark"}
      enableSystem={isThemeSwitchablePage}
      forcedTheme={isThemeSwitchablePage ? undefined : "dark"}
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
