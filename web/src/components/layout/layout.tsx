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
}

export function Layout({ 
  children, 
  showUserMenu = true, 
  showFooter = true,
  headerClassName = "",
  footerClassName = "",
  mainClassName = ""
}: LayoutProps) {
  return (
    <div className="min-h-screen bg-app">
      <Header showUserMenu={showUserMenu} className={headerClassName} />
      
      <main className={`pt-16 ${mainClassName}`}>
        {children}
      </main>
      
      {showFooter && <Footer className={footerClassName} />}
    </div>
  );
} 