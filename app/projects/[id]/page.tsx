import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ItemsBoard } from "./items-board";
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
  sort_order: number;
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
      "id, name, image_url, sort_order, notes(id, content, tag_id, resolved, tags(name))"
    )
    .eq("project_id", id)
    .order("sort_order", { ascending: true })) as {
    data: ItemWithNotes[] | null;
    error: { message: string } | null;
  };

  let effectiveItems = items ?? [];

  if (!error && effectiveItems.length === 0) {
    const { data: seedItem } = (await supabase
      .from("items")
      .insert({ project_id: id, name: "", sort_order: 1000 })
      .select("id, name, image_url, sort_order")
      .single()) as {
      data: Omit<ItemWithNotes, "notes"> | null;
    };

    if (seedItem) {
      effectiveItems = [{ ...seedItem, notes: [] }];
    }
  }

  const { data: customTags } = (await supabase
    .from("tags")
    .select("id, name")
    .eq("project_id", id)) as { data: { id: string; name: string }[] | null };

  const tags = [...DEFAULT_TAGS, ...(customTags ?? [])];

  const sortedItems = effectiveItems.map((item) => ({
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
      <main className="flex flex-1 w-full max-w-6xl flex-col items-center py-32 px-16 bg-white dark:bg-black">
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
          <ItemsBoard items={sortedItems} projectId={id} tags={tags} />
        )}
      </main>
    </div>
  );
}
