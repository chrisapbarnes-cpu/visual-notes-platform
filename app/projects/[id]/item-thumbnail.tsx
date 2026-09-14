"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { StorageApiError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

const MAC_RESIZE_TIP =
  "Tip for Mac users: Select all images, double-click to open Preview, select all thumbnails in the sidebar (Cmd+A), go to Tools > Adjust Size, and enter 50 for the resolution.";

function getFileExtension(filename: string): string {
  const match = filename.match(/\.([a-zA-Z0-9]+)$/);
  return match ? `.${match[1].toLowerCase()}` : "";
}

function describeUploadFailure(
  fileName: string,
  error: StorageApiError
): { message: string; isTooLarge: boolean } {
  const isTooLarge = error.code === "EntityTooLarge";

  if (!isTooLarge) {
    return { message: `"${fileName}" failed to upload: ${error.message}`, isTooLarge: false };
  }

  const limitMatch = error.message.match(/(\d+(?:\.\d+)?\s?(?:bytes|[kmgt]b))/i);
  return {
    message: `"${fileName}" exceeded the maximum allowed file size${
      limitMatch ? ` (limit: ${limitMatch[1]})` : ""
    }.`,
    isTooLarge: true,
  };
}

function CameraIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 7h3l1.5-2h7L17 7h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z" />
      <circle cx="12" cy="13" r="3.2" />
    </svg>
  );
}

function PlusBadge() {
  return (
    <span className="absolute bottom-0.5 right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-zinc-500 text-white">
      <svg
        viewBox="0 0 16 16"
        width="9"
        height="9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M8 2v12M2 8h12" />
      </svg>
    </span>
  );
}

export function ItemThumbnail({
  itemId,
  imageUrl,
  itemName,
  projectId,
}: {
  itemId: string;
  imageUrl: string | null;
  itemName: string;
  projectId: string;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<{
    message: string;
    isTooLarge: boolean;
  } | null>(null);

  async function handleFileSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || isUploading) return;

    setIsUploading(true);
    setUploadError(null);

    const path = `${projectId}/${crypto.randomUUID()}${getFileExtension(file.name)}`;
    const { error: fileUploadError } = await supabase.storage
      .from("Item-images")
      .upload(path, file);

    if (fileUploadError) {
      setUploadError(
        fileUploadError instanceof StorageApiError
          ? describeUploadFailure(file.name, fileUploadError)
          : { message: `"${file.name}" failed to upload.`, isTooLarge: false }
      );
    } else {
      const {
        data: { publicUrl },
      } = supabase.storage.from("Item-images").getPublicUrl(path);

      await supabase.from("items").update({ image_url: publicUrl }).eq("id", itemId);
      router.refresh();
    }

    setIsUploading(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        aria-label={imageUrl ? "Replace image" : "Upload image"}
        className="mx-auto block aspect-video h-24 cursor-pointer overflow-hidden rounded disabled:opacity-50"
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={itemName}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="relative flex h-full w-full items-center justify-center bg-zinc-300 text-zinc-500">
            <CameraIcon />
            <PlusBadge />
          </span>
        )}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelected}
        className="hidden"
      />
      {uploadError && (
        <div className="mt-1 text-left">
          <p className="text-xs text-red-600">{uploadError.message}</p>
          {uploadError.isTooLarge && (
            <p className="mt-0.5 text-[11px] text-zinc-400">{MAC_RESIZE_TIP}</p>
          )}
        </div>
      )}
    </>
  );
}
