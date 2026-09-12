"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getTagColorClasses } from "./tag-colors";

const NEW_TAG_VALUE = "__new__";

export function TagPicker({
  tagId,
  tagName,
  tags,
  projectId,
  onSelect,
}: {
  tagId: string | null;
  tagName: string | null;
  tags: { id: string; name: string }[];
  projectId: string;
  onSelect: (
    tagId: string | null,
    tagName: string | null
  ) => void | Promise<void>;
}) {
  const router = useRouter();
  const selectRef = useRef<HTMLSelectElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  function startEditing() {
    flushSync(() => {
      setIsEditing(true);
    });
    selectRef.current?.showPicker?.();
  }

  async function handleChange(e: ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;

    if (value === NEW_TAG_VALUE) {
      const name = window.prompt("New tag name:")?.trim();
      if (!name) {
        setIsEditing(false);
        return;
      }

      setIsBusy(true);
      const { data, error } = await supabase
        .from("tags")
        .insert({ project_id: projectId, name })
        .select("id, name")
        .single();
      setIsBusy(false);
      setIsEditing(false);

      if (error || !data) return;

      router.refresh();
      await onSelect(data.id, data.name);
      return;
    }

    const selectedTag = tags.find((tag) => tag.id === value);
    setIsEditing(false);
    await onSelect(value || null, selectedTag?.name ?? null);
  }

  if (isEditing) {
    return (
      <select
        ref={selectRef}
        autoFocus
        defaultValue={tagId ?? ""}
        onChange={handleChange}
        onBlur={() => setIsEditing(false)}
        disabled={isBusy}
        className="w-full rounded border border-black/[.08] bg-white px-1 py-0.5 text-sm text-black"
      >
        <option value="">No tag</option>
        {tags.map((tag) => (
          <option key={tag.id} value={tag.id}>
            {tag.name}
          </option>
        ))}
        <option value={NEW_TAG_VALUE}>+ New tag</option>
      </select>
    );
  }

  return (
    <button
      type="button"
      onClick={startEditing}
      className={`rounded-full px-2 py-0.5 text-xs font-medium hover:opacity-80 ${getTagColorClasses(
        tagName
      )}`}
    >
      {tagName ?? "No tag"}
    </button>
  );
}
