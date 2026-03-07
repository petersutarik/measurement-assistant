import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BrainCircuit, GitCompare, Code2 } from "lucide-react";

const btnBase =
  "inline-flex h-9 items-center justify-center rounded-lg px-2.5 text-sm font-medium transition-all";
const btnPrimary = `${btnBase} bg-primary text-primary-foreground hover:bg-primary/80`;
const btnOutline = `${btnBase} border border-border bg-background hover:bg-muted hover:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50`;

const features = [
  {
    icon: BrainCircuit,
    title: "AI-Generated Specs",
    description:
      "Automatically generate dataLayer specifications from your website, powered by AI analysis.",
  },
  {
    icon: GitCompare,
    title: "Version Control",
    description:
      "Track changes to your measurement plans with built-in versioning and approval workflows.",
  },
  {
    icon: Code2,
    title: "Developer Handoff",
    description:
      "Export implementation-ready specs with code snippets and validation rules for your dev team.",
  },
];

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="mx-auto max-w-5xl px-4">
      {/* Hero */}
      <section className="py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          DataLayer documentation,
          <br />
          powered by AI
        </h1>
        <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-lg">
          Generate measurement plans, manage dataLayer specs, and hand off
          implementation-ready documentation to your development team.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          {user ? (
            <Link href="/dashboard" className={btnPrimary}>
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link href="/signup" className={btnPrimary}>
                Get Started
              </Link>
              <Link href="/login" className={btnOutline}>
                Log in
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="grid gap-6 pb-24 sm:grid-cols-3">
        {features.map((feature) => (
          <Card key={feature.title}>
            <CardHeader>
              <feature.icon className="text-primary mb-2 size-8" />
              <CardTitle>{feature.title}</CardTitle>
              <CardDescription>{feature.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>

      {/* Bottom CTA */}
      <section className="border-t py-16 text-center">
        <h2 className="text-2xl font-semibold">
          Ready to streamline your measurement workflow?
        </h2>
        <p className="text-muted-foreground mt-2">
          Start generating specs in minutes, not days.
        </p>
        {user ? (
          <Link href="/dashboard" className={`${btnPrimary} mt-6`}>
            Go to Dashboard
          </Link>
        ) : (
          <Link href="/signup" className={`${btnPrimary} mt-6`}>
            Get Started Free
          </Link>
        )}
      </section>
    </div>
  );
}
