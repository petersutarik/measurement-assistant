import { redirect } from "next/navigation";

export default async function VersionPage({
  params,
}: {
  params: Promise<{ id: string; versionNumber: string }>;
}) {
  const { id, versionNumber } = await params;
  redirect(`/projects/${id}/versions/${versionNumber}/events`);
}
