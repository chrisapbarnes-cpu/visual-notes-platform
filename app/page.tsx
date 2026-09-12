import { supabase } from "@/lib/supabase";

export default async function Home() {
  const { data: companies, error } = await supabase
    .from("companies")
    .select("name");

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center py-32 px-16 bg-white dark:bg-black">
        <h1 className="text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
          Companies
        </h1>
        {error ? (
          <p className="mt-6 text-red-600">
            Failed to load companies: {error.message}
          </p>
        ) : (
          <ul className="mt-6 flex flex-col gap-2 text-lg text-zinc-800 dark:text-zinc-200">
            {companies.map((company, index) => (
              <li key={index}>{company.name}</li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
