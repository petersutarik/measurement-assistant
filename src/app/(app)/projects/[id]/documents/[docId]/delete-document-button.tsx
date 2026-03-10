"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteDocument } from "../actions";

export function DeleteDocumentButton({
  projectId,
  docId,
}: {
  projectId: string;
  docId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() => {
        if (!confirm("Delete this document? This cannot be undone.")) return;
        startTransition(async () => {
          await deleteDocument(projectId, docId);
          router.push(`/projects/${projectId}/documents`);
        });
      }}
    >
      {isPending ? (
        <Loader2 className="mr-1 size-3.5 animate-spin" />
      ) : (
        <Trash2 className="mr-1 size-3.5" />
      )}
      Delete
    </Button>
  );
}
