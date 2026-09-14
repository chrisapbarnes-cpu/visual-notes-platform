"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { TagPicker } from "./tag-picker";

export function NoteForm({
  itemId,
  projectId,
  tags,
}: {
  itemId: string;
  projectId: string;
  tags: { id: string; name: string }[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [tagId, setTagId] = useState<string | null>(null);
  const [tagName, setTagName] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    const { error } = await supabase.from("notes").insert({
      item_id: itemId,
      tag_id: tagId,
      content: content.trim(),
    });

    setIsSubmitting(false);

    if (error) {
      setError("Failed to add note.");
      return;
    }

    setContent("");
    setTagId(null);
    setTagName(null);
    router.refresh();
  }

  async function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      await submit();
      inputRef.current?.focus();
    }
  }

  return (
    <>
      <td className="h-9 py-1 pr-0.5 text-center align-middle">
        <TagPicker
          tagId={tagId}
          tagName={tagName}
          tags={tags}
          projectId={projectId}
          onSelect={(newTagId, newTagName) => {
            setTagId(newTagId);
            setTagName(newTagName);
          }}
        />
      </td>
      <td className="py-1 pr-0.5" />
      <td className="py-1 pr-4 align-top">
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={submit}
            placeholder="Add a note..."
            className="min-w-[160px] flex-1 bg-transparent px-1 py-0.5 text-sm text-black outline-none"
          />
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </td>
    </>
  );
}
