"use client";

import type { ReactNode } from "react";

import { Header } from "./header";
import { Footer } from "./footer";

interface LayoutProps {
  children: ReactNode;
  showUserMenu?: boolean;
  showFooter?: boolean;
  headerClassName?: string;
  footerClassName?: string;
  mainClassName?: string;
  fullHeight?: boolean;
}

export function Layout({ 
  children, 
  showUserMenu = true, 
  showFooter = true,
  headerClassName = "",
  footerClassName = "",
  mainClassName = "",
  fullHeight = false
}: LayoutProps) {
  return (
    <div className={`${fullHeight ? 'h-screen' : 'min-h-screen'} bg-app`}>
      <Header showUserMenu={showUserMenu} className={headerClassName} />
      
      <main className={`pt-16 ${mainClassName} ${fullHeight ? 'h-[calc(100vh-4rem)]' : ''}`}>
        {children}
      </main>
      
      {showFooter && !fullHeight && <Footer className={footerClassName} />}
    </div>
  );
} 