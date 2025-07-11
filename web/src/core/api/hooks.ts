// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

import { useEffect, useRef, useState } from "react";

import { env } from "~/env";

import { useReplay } from "../replay";

import { fetchReplayTitle } from "./chat";
import { getConfig } from "./config";

export function useReplayMetadata() {
  const { isReplay } = useReplay();
  const [title, setTitle] = useState<string | null>(null);
  const isLoading = useRef(false);
  const [error, setError] = useState<boolean>(false);
  useEffect(() => {
    if (!isReplay) {
      return;
    }
    if (title || isLoading.current) {
      return;
    }
    isLoading.current = true;
    fetchReplayTitle()
      .then((title) => {
        setError(false);
        setTitle(title ?? null);
        if (title) {
          document.title = `${title} - IAS_Mind`;
        }
      })
      .catch(() => {
        setError(true);
        setTitle("Error: the replay is not available.");
        document.title = "IAS_Mind";
      })
      .finally(() => {
        isLoading.current = false;
      });
  }, [isLoading, isReplay, title]);
  return { title, isLoading, hasError: error };
}

export function useRAGProvider() {
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState<string | null>(null);

  useEffect(() => {
    if (env.NEXT_PUBLIC_STATIC_WEBSITE_ONLY) {
      setLoading(false);
      return;
    }
    setProvider(getConfig().rag?.provider ?? "local_milvus");
    setLoading(false);
  }, []);

  return { provider, loading };
}
