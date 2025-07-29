// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

"use client";

import { Layout } from "~/components/layout";
import { ChartsMain } from "./main";

export default function ChartsPage() {
  return (
    <Layout fullHeight={true} showFooter={false}>
      <div className="flex h-full w-full overscroll-none">
        <ChartsMain />
      </div>
    </Layout>
  );
}
