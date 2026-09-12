import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ItemNotesSection } from "./item-notes-section";
import { DEFAULT_TAGS } from "./default-tags";

type ProjectWithCompany = {
  company_id: string;
  name: string;
  companies: { name: string } | null;
};

type ItemWithNotes = {
  id: string;
  name: string;
  image_url: string | null;
  notes: {
    id: string;
    content: string;
    tag_id: string | null;
    resolved: boolean;
    tags: { name: string } | null;
  }[];
};

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const cookieStore = await cookies();
  const companyId = cookieStore.get("company_id")?.value;

  if (!companyId) {
    redirect("/login");
  }

  const { data: project } = (await supabase
    .from("projects")
    .select("company_id, name, companies(name)")
    .eq("id", id)
    .single()) as { data: ProjectWithCompany | null };

  if (!project || project.company_id !== companyId) {
    notFound();
  }

  const { data: items, error } = (await supabase
    .from("items")
    .select(
      "id, name, image_url, notes(id, content, tag_id, resolved, tags(name))"
    )
    .eq("project_id", id)) as { data: ItemWithNotes[] | null; error: { message: string } | null };

  const { data: customTags } = (await supabase
    .from("tags")
    .select("id, name")
    .eq("project_id", id)) as { data: { id: string; name: string }[] | null };

  const tags = [...DEFAULT_TAGS, ...(customTags ?? [])];

  const sortedItems = (items ?? []).map((item) => ({
    ...item,
    notes: [...item.notes].sort((a, b) => {
      const aName = a.tags?.name;
      const bName = b.tags?.name;
      if (!aName && !bName) return 0;
      if (!aName) return 1;
      if (!bName) return -1;
      return aName.localeCompare(bName);
    }),
  }));

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-5xl flex-col items-center py-32 px-16 bg-white dark:bg-black">
        <h1 className="text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
          {project?.companies?.name}
        </h1>
        <h2 className="mt-4 text-xl font-semibold text-zinc-600 dark:text-zinc-400">
          {project?.name}
        </h2>
        {error ? (
          <p className="mt-6 text-red-600">
            Failed to load items: {error.message}
          </p>
        ) : (
          <table className="mt-6 w-full table-fixed border-separate border-spacing-0 text-left text-zinc-800 dark:text-zinc-200">
            <thead>
              <tr className="border-b border-black/[.08] dark:border-white/[.145]">
                <th className="w-[18%] py-2 pr-4 text-center font-medium">Item</th>
                <th className="w-[13%] py-2 pr-4 text-center font-medium">Thumbnail</th>
                <th className="w-[10%] py-2 pr-0.5 text-center font-medium">Tag</th>
                <th className="w-[5%] py-2 pr-0.5 text-center font-medium" aria-label="Done" />
                <th className="w-[54%] py-2 pr-4 font-medium">Note</th>
              </tr>
            </thead>
            {sortedItems.map((item) => (
              <tbody key={item.id}>
                <tr aria-hidden="true">
                  <td className="h-3 p-0" colSpan={5} />
                </tr>
                <tr>
                  <td className="p-0" colSpan={5}>
                    <table className="w-full table-fixed border-separate border-spacing-0 overflow-hidden rounded-xl border border-black/[.08] bg-[#D9D9D9] text-black shadow-sm">
                      <colgroup>
                        <col className="w-[18%]" />
                        <col className="w-[13%]" />
                        <col className="w-[10%]" />
                        <col className="w-[5%]" />
                        <col className="w-[54%]" />
                      </colgroup>
                      <tbody>
                        <ItemNotesSection item={item} projectId={id} tags={tags} />
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            ))}
          </table>
        )}
      </main>
    </div>
  );
}
