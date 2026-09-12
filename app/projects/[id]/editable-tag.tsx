"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { TagPicker } from "./tag-picker";

export function EditableTag({
  noteId,
  projectId,
  tagId,
  tagName,
  tags,
}: {
  noteId: string;
  projectId: string;
  tagId: string | null;
  tagName: string | null;
  tags: { id: string; name: string }[];
}) {
  const router = useRouter();

  async function handleSelect(newTagId: string | null) {
    await supabase.from("notes").update({ tag_id: newTagId }).eq("id", noteId);
    router.refresh();
  }

  return (
    <TagPicker
      tagId={tagId}
      tagName={tagName}
      tags={tags}
      projectId={projectId}
      onSelect={handleSelect}
    />
  );
}
