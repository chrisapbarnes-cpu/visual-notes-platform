"use client";

import { useRef, useState, type FocusEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export function EditableItemName({
  itemId,
  name,
  autoEdit = false,
}: {
  itemId: string;
  name: string;
  autoEdit?: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(autoEdit);
  const [value, setValue] = useState(name);
  const [isSaving, setIsSaving] = useState(false);

  async function save() {
    if (isSaving) return;
    setIsSaving(true);

    const trimmed = value.trim();
    if (trimmed !== name) {
      await supabase.from("items").update({ name: trimmed }).eq("id", itemId);
      router.refresh();
    }

    setIsSaving(false);
    setIsEditing(false);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      inputRef.current?.blur();
    }
  }

  function handleFocus(e: FocusEvent<HTMLInputElement>) {
    e.target.select();
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
        onFocus={handleFocus}
        onBlur={save}
        disabled={isSaving}
        placeholder="Type name..."
        className="w-full rounded border border-black/[.08] bg-white px-1 py-0.5 text-center text-sm text-black placeholder:text-zinc-400"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setValue(name);
        setIsEditing(true);
      }}
      className="w-full rounded px-1 py-0.5 text-center text-black hover:bg-black/[.06]"
    >
      {name ? name : <span className="text-zinc-400">Type name...</span>}
    </button>
  );
}
