// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

"use client";

import { Layout } from "~/components/layout";
import { KnowledgeBaseMain } from "./main";

export default function KnowledgeBasePage() {
  return (
    <Layout showFooter={false}>
      <div className="flex h-screen w-screen justify-center overscroll-none">
        <KnowledgeBaseMain />
      </div>
    </Layout>
  );
} 