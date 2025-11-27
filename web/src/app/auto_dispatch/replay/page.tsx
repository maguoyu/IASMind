// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

"use client";

import { useEffect } from "react";
import { Layout } from "~/components/layout";
import { AutoDispatchReplayMain } from "./main";

export default function AutoDispatchReplayPage() {
  // 禁用页面滚动
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, []);

  return (
    <Layout fullHeight={true} showFooter={false} mainClassName="overflow-hidden">
      <div className="flex h-full w-full justify-center overscroll-none overflow-hidden" style={{ height: '100%', width: '100%', overflow: 'hidden' }}>
        <AutoDispatchReplayMain />
      </div>
    </Layout>
  );
}

