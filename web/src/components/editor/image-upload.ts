// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

import { createImageUpload } from "novel";
import { toast } from "sonner";
import { imageUploadApi } from "~/core/api";

const onUpload = (file: File) => {
  const promise = imageUploadApi.uploadImage(file);

  return new Promise((resolve, reject) => {
    toast.promise(
      promise.then(async (response) => {
        // Successfully uploaded image
        if (response.data) {
          const { url } = response.data;
          // preload the image
          const image = new Image();
          image.src = url;
          image.onload = () => {
            resolve(url);
          };
          // No blob store configured
        } else if (response.status === 401) {
          resolve(file);
          throw new Error(
            "`BLOB_READ_WRITE_TOKEN` environment variable not found, reading image locally instead.",
          );
          // Unknown error
        } else {
          throw new Error(response.error || "Error uploading image. Please try again.");
        }
      }),
      {
        loading: "Uploading image...",
        success: "Image uploaded successfully.",
        error: (e) => {
          reject(e);
          return e.message;
        },
      },
    );
  });
};

export const uploadFn = createImageUpload({
  onUpload,
  validateFn: (file) => {
    if (!file.type.includes("image/")) {
      toast.error("File type not supported.");
      return false;
    }
    if (file.size / 1024 / 1024 > 20) {
      toast.error("File size too big (max 20MB).");
      return false;
    }
    return true;
  },
});
