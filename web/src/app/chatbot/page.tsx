// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

"use client";

import { Layout } from "~/components/layout";
import { ChatbotMain } from "./main";

export default function ChatbotPage() {
  return (
    <Layout fullHeight={true} showFooter={false}>
      <div className="flex h-full w-full justify-center overscroll-none">
        <ChatbotMain />
      </div>
    </Layout>
  );
}
