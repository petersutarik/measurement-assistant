import { redirect } from "next/navigation";

export default async function WorkspaceDetailPage({
  params,
}: {
  params: Promise<{ id: string; workspaceId: string }>;
}) {
  const { id, workspaceId } = await params;
  redirect(`/projects/${id}/workspaces/${workspaceId}/events`);
}
