// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

"use client";

import { Layout } from "~/components/layout";
import { ReportsMain } from "./main";

export default function ReportsPage() {
  return (
    <Layout showFooter={false}>
      <div className="flex h-screen w-screen justify-center overscroll-none">
        <ReportsMain />
      </div>
    </Layout>
  );
}
