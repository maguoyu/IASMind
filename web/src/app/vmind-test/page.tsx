"use client";

import { Layout } from "~/components/layout";
import { VmindTestMain } from "./main";

export default function VmindTestPage() {
  return (
    <Layout fullHeight={true} showFooter={false}>
      <div className="flex h-full w-full justify-center overscroll-none">
        <VmindTestMain />
      </div>
    </Layout>
  );
} 