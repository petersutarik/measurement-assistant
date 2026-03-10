import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LayoutTemplate } from "lucide-react";
import { getTemplates } from "./actions";
import { TemplateActions } from "./template-actions";

export default async function TemplatesPage() {
  const templates = await getTemplates();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Plan Templates
          </h1>
          <p className="text-muted-foreground text-sm">
            Reusable measurement plan templates. Reference them with{" "}
            <code className="bg-muted px-1 py-0.5 rounded text-xs">
              @template:Name
            </code>{" "}
            in the planning chat.
          </p>
        </div>
        <TemplateActions type="create" />
      </div>

      {templates.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="group relative flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <LayoutTemplate className="size-4 text-muted-foreground shrink-0" />
                  <CardTitle className="text-base truncate">
                    {template.name}
                  </CardTitle>
                  {!template.accountId && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0 shrink-0"
                    >
                      Built-in
                    </Badge>
                  )}
                </div>
                <CardDescription className="line-clamp-2">
                  {template.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {template.document
                    ? `${template.document.split("\n").length} lines`
                    : "Empty"}
                </p>
                <TemplateActions
                  type="row"
                  templateId={template.id}
                  templateName={template.name}
                  templateDescription={template.description}
                  templateDocument={template.document}
                  isSystem={!template.accountId}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <LayoutTemplate className="mx-auto size-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              No plan templates yet. Create one to speed up your measurement
              planning.
            </p>
            <TemplateActions type="create" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
