"use client";

import { useTransition } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteDocument } from "./actions";

export function DeleteDocumentButton({
  projectId,
  docId,
}: {
  projectId: string;
  docId: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
      disabled={isPending}
      onClick={() => {
        if (!confirm("Delete this document?")) return;
        startTransition(() => deleteDocument(projectId, docId));
      }}
    >
      {isPending ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <Trash2 className="size-3.5" />
      )}
    </Button>
  );
}
