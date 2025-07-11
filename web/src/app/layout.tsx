// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";
import Script from "next/script";

import { ThemeProviderWrapper } from "~/components/deer-flow/theme-provider-wrapper";
import { RouteChangeHandler } from "~/components/deer-flow/route-change-handler";
import { PreventLayoutShift } from "~/components/deer-flow/prevent-layout-shift";
import { AuthProvider } from "~/components/auth/auth-provider";
import { loadConfig } from "~/core/api/config";
import { env } from "~/env";

import { Toaster } from "../components/deer-flow/toaster";

export const metadata: Metadata = {
  title: "🧠 IAS_Mind",
  description:
    "Deep Exploration and Efficient Research, an AI tool that combines language models with specialized tools for research tasks.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const conf = await loadConfig();
  return (
    <html lang="en" className={`${geist.variable}`} suppressHydrationWarning>
      <head>
        <script>{`window.__iasmindConfig = ${JSON.stringify(conf)}`}</script>
        
        {/* 防抖动：立即执行脚本 */}
        <Script id="prevent-layout-shift" strategy="beforeInteractive">
          {`
            // 立即计算并设置滚动条宽度
            (function() {
              const outer = document.createElement('div');
              outer.style.visibility = 'hidden';
              outer.style.overflow = 'scroll';
              outer.style.msOverflowStyle = 'scrollbar';
              document.body.appendChild(outer);
              
              const inner = document.createElement('div');
              outer.appendChild(inner);
              
              const scrollbarWidth = outer.offsetWidth - inner.offsetWidth;
              document.body.removeChild(outer);
              
              document.documentElement.style.setProperty('--scrollbar-width', scrollbarWidth + 'px');
              
              // 强制显示滚动条
              document.documentElement.style.overflowY = 'scroll';
              
              // 监听body变化
              const observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                  if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    const target = mutation.target;
                    const style = target.getAttribute('style') || '';
                    
                    if (style.includes('overflow') && style.includes('hidden')) {
                      target.style.paddingRight = scrollbarWidth + 'px';
                      target.style.overflowY = 'scroll';
                    }
                  }
                });
              });
              
              if (document.body) {
                observer.observe(document.body, {
                  attributes: true,
                  attributeFilter: ['style', 'class']
                });
              } else {
                document.addEventListener('DOMContentLoaded', function() {
                  observer.observe(document.body, {
                    attributes: true,
                    attributeFilter: ['style', 'class']
                  });
                });
              }
            })();
          `}
        </Script>
        
        {/* Define isSpace function globally to fix markdown-it issues with Next.js + Turbopack
          https://github.com/markdown-it/markdown-it/issues/1082#issuecomment-2749656365 */}
        <Script id="markdown-it-fix" strategy="beforeInteractive">
          {`
            if (typeof window !== 'undefined' && typeof window.isSpace === 'undefined') {
              window.isSpace = function(code) {
                return code === 0x20 || code === 0x09 || code === 0x0A || code === 0x0B || code === 0x0C || code === 0x0D;
              };
            }
          `}
        </Script>
      </head>
      <body className="bg-app">
        <PreventLayoutShift />
        <ThemeProviderWrapper>
          <RouteChangeHandler />
          <AuthProvider>{children}</AuthProvider>
        </ThemeProviderWrapper>
        <Toaster />
        {
          // NO USER BEHAVIOR TRACKING OR PRIVATE DATA COLLECTION BY DEFAULT
          //
          // When `NEXT_PUBLIC_STATIC_WEBSITE_ONLY` is `true`, the script will be injected
          // into the page only when `AMPLITUDE_API_KEY` is provided in `.env`
        }
        {env.NEXT_PUBLIC_STATIC_WEBSITE_ONLY && env.AMPLITUDE_API_KEY && (
          <>
            <Script src="https://cdn.amplitude.com/script/d2197dd1df3f2959f26295bb0e7e849f.js"></Script>
            <Script id="amplitude-init" strategy="lazyOnload">
              {`window.amplitude.init('${env.AMPLITUDE_API_KEY}', {"fetchRemoteConfig":true,"autocapture":true});`}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
