"use client";

import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { EditableTag } from "./editable-tag";
import { EditableNoteText } from "./editable-note-text";
import { EditableItemName } from "./editable-item-name";
import { ItemThumbnail } from "./item-thumbnail";
import { NoteForm } from "./note-form";

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
  notes: Note[];
};

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 10 6"
      fill="none"
      aria-hidden="true"
      className={`h-2.5 w-2.5 shrink-0 text-black transition-transform duration-200 ${
        open ? "rotate-180" : ""
      }`}
    >
      <path
        d="M1 5L5 1L9 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ItemNotesSection({
  item,
  projectId,
  tags,
  autoEditName = false,
}: {
  item: Item;
  projectId: string;
  tags: { id: string; name: string }[];
  autoEditName?: boolean;
}) {
  const router = useRouter();
  const [showCompleted, setShowCompleted] = useState(false);

  const activeNotes = item.notes.filter((note) => !note.resolved);
  const resolvedNotes = item.notes.filter((note) => note.resolved);
  const rows = activeNotes.length > 0 ? activeNotes : [null];
  // Note rows + the "add a note" row + the toggle row + the completed-notes row.
  const totalRows = rows.length + 3;

  async function handleResolveChange(noteId: string, e: ChangeEvent<HTMLInputElement>) {
    const resolved = e.target.checked;
    await supabase.from("notes").update({ resolved }).eq("id", noteId);
    router.refresh();
  }

  return (
    <>
      {rows.map((note, index) => (
        <tr key={note?.id ?? `${item.id}-empty`}>
          {index === 0 && (
            <>
              <td
                className="py-2 pr-4 text-center align-middle"
                rowSpan={totalRows}
              >
                <EditableItemName
                  itemId={item.id}
                  name={item.name}
                  autoEdit={autoEditName}
                />
              </td>
              <td
                className="py-1.5 pr-4 text-center align-middle"
                rowSpan={totalRows}
              >
                <ItemThumbnail
                  itemId={item.id}
                  imageUrl={item.image_url}
                  itemName={item.name}
                  projectId={projectId}
                />
              </td>
            </>
          )}
          <td className="h-9 py-1 pr-0.5 text-center align-middle">
            {note ? (
              <EditableTag
                noteId={note.id}
                projectId={projectId}
                tagId={note.tag_id}
                tagName={note.tags?.name ?? null}
                tags={tags}
              />
            ) : (
              ""
            )}
          </td>
          <td className="py-1 pr-0.5 text-center align-middle">
            {note ? (
              <input
                type="checkbox"
                defaultChecked={note.resolved}
                onChange={(e) => handleResolveChange(note.id, e)}
                aria-label="Mark note as resolved"
              />
            ) : (
              ""
            )}
          </td>
          <td className="py-1 pr-4 align-top">
            {note ? (
              <EditableNoteText noteId={note.id} content={note.content} />
            ) : (
              ""
            )}
          </td>
        </tr>
      ))}
      <tr>
        <NoteForm itemId={item.id} projectId={projectId} tags={tags} />
      </tr>
      <tr>
        <td className="py-1 pr-0.5" />
        <td className="py-1 pr-0.5" />
        <td className="py-1 pr-4 text-center align-middle">
          <button
            type="button"
            onClick={() => setShowCompleted((v) => !v)}
            className="inline-flex items-center gap-1.5 text-sm text-black hover:opacity-70"
          >
            <ChevronIcon open={showCompleted} />
            Show Completed Notes ({resolvedNotes.length})
          </button>
        </td>
      </tr>
      <tr>
        <td className="p-0" colSpan={3}>
          <div
            className="grid transition-[grid-template-rows] duration-300 ease-in-out"
            style={{ gridTemplateRows: showCompleted ? "1fr" : "0fr" }}
          >
            <div className="overflow-hidden">
              {resolvedNotes.map((note) => (
                <div
                  key={note.id}
                  className="grid grid-cols-[10fr_5fr_54fr]"
                >
                  <div className="flex h-9 items-center justify-center py-1 pr-0.5 text-center">
                    <EditableTag
                      noteId={note.id}
                      projectId={projectId}
                      tagId={note.tag_id}
                      tagName={note.tags?.name ?? null}
                      tags={tags}
                    />
                  </div>
                  <div className="flex items-center justify-center py-1 pr-0.5 text-center">
                    <input
                      type="checkbox"
                      defaultChecked={note.resolved}
                      onChange={(e) => handleResolveChange(note.id, e)}
                      aria-label="Mark note as resolved"
                    />
                  </div>
                  <div className="flex items-start py-1 pr-4">
                    <EditableNoteText noteId={note.id} content={note.content} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </td>
      </tr>
    </>
  );
}
