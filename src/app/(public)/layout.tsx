import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const btnLink =
  "border-border bg-background hover:bg-muted hover:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50 inline-flex h-7 items-center justify-center rounded-lg border px-2.5 text-sm font-medium";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href="/" className="text-lg font-semibold">
            Measurement Assistant
          </Link>
          {user ? (
            <Link href="/projects" className={btnLink}>
              Dashboard
            </Link>
          ) : (
            <Link href="/login" className={btnLink}>
              Log in
            </Link>
          )}
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
