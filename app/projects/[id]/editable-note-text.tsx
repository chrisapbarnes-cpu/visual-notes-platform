"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export function EditableNoteText({
  noteId,
  content,
}: {
  noteId: string;
  content: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(content);
  const [isSaving, setIsSaving] = useState(false);

  async function save() {
    if (isSaving) return;
    setIsSaving(true);

    const trimmed = value.trim();
    if (!trimmed) {
      await supabase.from("notes").delete().eq("id", noteId);
    } else {
      await supabase.from("notes").update({ content: trimmed }).eq("id", noteId);
    }

    setIsSaving(false);
    setIsEditing(false);
    router.refresh();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      inputRef.current?.blur();
    }
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        autoFocus
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={save}
        disabled={isSaving}
        className="w-full rounded border border-black/[.08] bg-white px-1 py-0.5 text-sm text-black"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setValue(content);
        setIsEditing(true);
      }}
      className="w-full rounded px-1 py-0.5 text-left text-black hover:bg-black/[.06]"
    >
      {content}
    </button>
  );
}
