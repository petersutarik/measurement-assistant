import {
  Type,
  Hash,
  ToggleLeft,
  List,
  Braces,
} from "lucide-react";

const typeConfig: Record<string, { icon: typeof Type; label: string }> = {
  string: { icon: Type, label: "string" },
  number: { icon: Hash, label: "number" },
  boolean: { icon: ToggleLeft, label: "boolean" },
  array: { icon: List, label: "array" },
  object: { icon: Braces, label: "object" },
};

export function ParamTypeIcon({
  type,
  className = "size-3.5",
}: {
  type: string;
  className?: string;
}) {
  const config = typeConfig[type];
  if (!config) return null;
  const Icon = config.icon;
  return <Icon className={className} />;
}
