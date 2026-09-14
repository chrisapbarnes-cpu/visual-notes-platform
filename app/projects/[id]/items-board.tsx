"use client";

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { StorageApiError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { ItemNotesSection } from "./item-notes-section";

type Note = {
  id: string;
  content: string;
  tag_id: string | null;
  resolved: boolean;
  tags: { name: string } | null;
};

type Item = {
  id: string;
  name: string;
  image_url: string | null;
  sort_order: number;
  notes: Note[];
};

function getFileExtension(filename: string): string {
  const match = filename.match(/\.([a-zA-Z0-9]+)$/);
  return match ? `.${match[1].toLowerCase()}` : "";
}

const MAC_RESIZE_TIP =
  "Tip for Mac users: Select all images, double-click to open Preview, select all thumbnails in the sidebar (Cmd+A), go to Tools > Adjust Size, and enter 50 for the resolution.";

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

function getStoragePathFromPublicUrl(url: string): string | null {
  const marker = "/object/public/Item-images/";
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return decodeURIComponent(url.slice(index + marker.length));
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="12"
      height="12"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M8 2v12M2 8h12" />
    </svg>
  );
}

function DragHandleIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="5" cy="3" r="1.3" />
      <circle cx="11" cy="3" r="1.3" />
      <circle cx="5" cy="8" r="1.3" />
      <circle cx="11" cy="8" r="1.3" />
      <circle cx="5" cy="13" r="1.3" />
      <circle cx="11" cy="13" r="1.3" />
    </svg>
  );
}

function MinusIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M3 8h10" />
    </svg>
  );
}

export function ItemsBoard({
  items,
  projectId,
  tags,
}: {
  items: Item[];
  projectId: string;
  tags: { id: string; name: string }[];
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [orderedItems, setOrderedItems] = useState(items);
  const [prevItems, setPrevItems] = useState(items);
  const [dragId, setDragId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newItemId, setNewItemId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadHasSizeError, setUploadHasSizeError] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(
    null
  );

  if (items !== prevItems) {
    setPrevItems(items);
    setOrderedItems(items);
  }

  function handleDragOver(e: DragEvent<HTMLTableRowElement>, overId: string) {
    e.preventDefault();
    if (!dragId || dragId === overId) return;
    setOrderedItems((prev) => {
      const fromIndex = prev.findIndex((item) => item.id === dragId);
      const toIndex = prev.findIndex((item) => item.id === overId);
      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
        return prev;
      }
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }

  async function handleDrop(e: DragEvent<HTMLTableRowElement>) {
    e.preventDefault();
    if (!dragId) return;
    setDragId(null);

    await Promise.all(
      orderedItems.map((item, index) =>
        supabase
          .from("items")
          .update({ sort_order: (index + 1) * 1000 })
          .eq("id", item.id)
      )
    );
    router.refresh();
  }

  async function handleAddItem() {
    if (isAdding) return;
    setIsAdding(true);

    const maxSortOrder = orderedItems.reduce(
      (max, item) => Math.max(max, item.sort_order),
      0
    );

    const { data, error } = await supabase
      .from("items")
      .insert({
        project_id: projectId,
        name: "",
        sort_order: maxSortOrder + 1000,
      })
      .select("id, name, image_url, sort_order")
      .single();

    setIsAdding(false);

    if (!error && data) {
      setOrderedItems((prev) => [...prev, { ...data, notes: [] }]);
      setNewItemId(data.id);
      router.refresh();
    }
  }

  async function handleFilesSelected(e: ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0 || isUploading) return;

    const sortedFiles = Array.from(fileList).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    e.target.value = "";
    setIsUploading(true);
    setUploadError(null);

    const baseSortOrder = orderedItems.reduce(
      (max, item) => Math.max(max, item.sort_order),
      0
    );

    const newItems: Item[] = [];
    const fileErrors: string[] = [];
    let hasSizeError = false;

    for (let i = 0; i < sortedFiles.length; i++) {
      const file = sortedFiles[i];
      const path = `${projectId}/${crypto.randomUUID()}${getFileExtension(file.name)}`;

      const { error: fileUploadError } = await supabase.storage
        .from("Item-images")
        .upload(path, file);

      if (fileUploadError) {
        if (fileUploadError instanceof StorageApiError) {
          const { message, isTooLarge } = describeUploadFailure(file.name, fileUploadError);
          fileErrors.push(message);
          if (isTooLarge) hasSizeError = true;
        } else {
          fileErrors.push(`"${file.name}" failed to upload.`);
        }
        continue;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("Item-images").getPublicUrl(path);

      const { data, error: insertError } = await supabase
        .from("items")
        .insert({
          project_id: projectId,
          name: "",
          image_url: publicUrl,
          sort_order: baseSortOrder + (i + 1) * 1000,
        })
        .select("id, name, image_url, sort_order")
        .single();

      if (insertError || !data) {
        fileErrors.push(`"${file.name}" failed to upload.`);
        continue;
      }

      newItems.push({ ...data, notes: [] });
    }

    if (newItems.length > 0) {
      setOrderedItems((prev) => [...prev, ...newItems]);
      router.refresh();
    }

    setUploadError(fileErrors.length > 0 ? fileErrors.join(" ") : null);
    setUploadHasSizeError(hasSizeError);
    setIsUploading(false);
  }

  async function handleDeleteItem(item: Item) {
    setConfirmingDeleteId(null);

    if (item.image_url) {
      const path = getStoragePathFromPublicUrl(item.image_url);
      if (path) {
        await supabase.storage.from("Item-images").remove([path]);
      }
    }

    await supabase.from("items").delete().eq("id", item.id);

    setOrderedItems((prev) => prev.filter((i) => i.id !== item.id));
    router.refresh();
  }

  return (
    <table className="mt-6 w-full table-fixed border-separate border-spacing-0 text-left text-zinc-800 dark:text-zinc-200">
      <thead>
        <tr className="border-b border-black/[.08] dark:border-white/[.145]">
          <th className="w-[4%] py-2" aria-label="Reorder" />
          <th className="w-[13%] py-2 pr-4 text-center font-medium">Item</th>
          <th className="w-[20%] py-2 pr-4 text-center font-medium">
            Thumbnail
          </th>
          <th className="w-[8%] py-2 pr-0.5 text-center font-medium">Tag</th>
          <th
            className="w-[4%] py-2 pr-0.5 text-center font-medium"
            aria-label="Done"
          />
          <th className="w-[47%] py-2 pr-4 font-medium">Note</th>
          <th className="w-[4%] py-2" aria-label="Remove" />
        </tr>
      </thead>
      {orderedItems.map((item) => (
        <tbody key={item.id}>
          <tr aria-hidden="true">
            <td className="h-3 p-0" colSpan={7} />
          </tr>
          <tr
            onDragOver={(e) => handleDragOver(e, item.id)}
            onDrop={handleDrop}
          >
            <td className="p-0 text-center align-middle">
              <div
                draggable
                onDragStart={() => setDragId(item.id)}
                onDragEnd={() => setDragId(null)}
                role="button"
                aria-label="Drag to reorder"
                className="flex h-full cursor-grab items-center justify-center py-2 text-zinc-500 active:cursor-grabbing"
              >
                <DragHandleIcon />
              </div>
            </td>
            <td className="p-0" colSpan={5}>
              <table className="w-full table-fixed border-separate border-spacing-0 overflow-hidden rounded-xl border border-black/[.08] bg-[#D9D9D9] text-black shadow-sm">
                <colgroup>
                  <col className="w-[14%]" />
                  <col className="w-[22%]" />
                  <col className="w-[9%]" />
                  <col className="w-[4%]" />
                  <col className="w-[51%]" />
                </colgroup>
                <tbody>
                  <ItemNotesSection
                    item={item}
                    projectId={projectId}
                    tags={tags}
                    autoEditName={item.id === newItemId}
                  />
                </tbody>
              </table>
            </td>
            <td className="relative p-0 text-center align-middle">
              <button
                type="button"
                onClick={() => setConfirmingDeleteId(item.id)}
                aria-label="Remove item"
                className="flex h-full w-full cursor-pointer items-center justify-center py-2 text-zinc-400 hover:text-zinc-600"
              >
                <MinusIcon />
              </button>
              {confirmingDeleteId === item.id && (
                <div className="absolute right-full top-1/2 z-10 w-56 -translate-y-1/2 rounded-lg border border-black/[.08] bg-white p-3 text-left text-sm text-black shadow-lg">
                  <p>Are you sure you wish to delete this item?</p>
                  <div className="mt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmingDeleteId(null)}
                      className="cursor-pointer rounded px-2 py-1 text-zinc-600 hover:bg-black/[.06]"
                    >
                      No
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item)}
                      className="cursor-pointer rounded bg-red-600 px-2 py-1 text-white hover:bg-red-700"
                    >
                      Yes
                    </button>
                  </div>
                </div>
              )}
            </td>
          </tr>
        </tbody>
      ))}
      <tbody>
        <tr>
          <td className="p-0" />
          <td className="py-3 text-center align-middle">
            <button
              type="button"
              onClick={handleAddItem}
              disabled={isAdding}
              className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded px-2 py-1 text-sm font-medium text-zinc-600 disabled:opacity-50 dark:text-zinc-400"
            >
              <PlusIcon />
              Add New Item
            </button>
          </td>
          <td className="py-3 text-center align-middle">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded px-2 py-1 text-sm font-medium text-zinc-600 disabled:opacity-50 dark:text-zinc-400"
            >
              <PlusIcon />
              {isUploading ? "Uploading…" : "Batch Upload Images"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFilesSelected}
              className="hidden"
            />
          </td>
          <td className="p-0" colSpan={4} />
        </tr>
        {uploadError && (
          <tr>
            <td className="p-0" />
            <td className="pb-2 text-center" colSpan={6}>
              <p className="text-sm text-red-600">{uploadError}</p>
              {uploadHasSizeError && (
                <p className="mt-1 text-xs text-zinc-400">{MAC_RESIZE_TIP}</p>
              )}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
