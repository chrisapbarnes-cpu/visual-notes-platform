import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default async function Home() {
  const cookieStore = await cookies();
  const companyId = cookieStore.get("company_id")?.value;

  if (!companyId) {
    redirect("/login");
  }

  const [{ data: company }, { data: projects, error }] = await Promise.all([
    supabase.from("companies").select("name").eq("id", companyId).single(),
    supabase.from("projects").select("id, name").eq("company_id", companyId),
  ]);

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center py-32 px-16 bg-white dark:bg-black">
        <h1 className="text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
          {company?.name}
        </h1>
        <h2 className="mt-10 text-xl font-semibold text-black dark:text-zinc-50">
          Projects
        </h2>
        {error ? (
          <p className="mt-6 text-red-600">
            Failed to load projects: {error.message}
          </p>
        ) : (
          <ul className="mt-6 flex flex-col gap-2 text-lg text-zinc-800 dark:text-zinc-200">
            {projects.map((project) => (
              <li key={project.id}>
                <Link
                  href={`/projects/${project.id}`}
                  className="hover:underline"
                >
                  {project.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
