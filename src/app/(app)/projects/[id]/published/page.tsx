import { redirect } from "next/navigation";

export default async function PublishedSpecPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/projects/${id}/published/events`);
}
