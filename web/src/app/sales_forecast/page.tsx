// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

"use client";

import { Layout } from "~/components/layout";
import { SalesForecastMain } from "./main";

export default function SalesForecastPage() {
  return (
    <Layout showFooter={false}>
      <div className="flex h-screen w-screen justify-center overscroll-none">
        <SalesForecastMain />
      </div>
    </Layout>
  );
} 