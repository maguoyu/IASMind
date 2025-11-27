// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

"use client";

import { Layout } from "~/components/layout";
import { AutoDispatchMain } from "./main";

export default function AutoDispatchPage() {
  return (
    <Layout showFooter={false}>
      <div className="flex h-screen w-screen justify-center overscroll-none">
        <AutoDispatchMain />
      </div>
    </Layout>
  );
}


