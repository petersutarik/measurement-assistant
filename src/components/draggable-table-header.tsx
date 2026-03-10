"use client";

import { useMemo } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ColumnDef } from "@/hooks/use-column-order";

interface DraggableTableHeaderProps {
  columns: ColumnDef[];
  onReorder: (activeId: string, overId: string) => void;
  extraHeads?: React.ReactNode;
}

function SortableTableHead({ column }: { column: ColumnDef }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableHead ref={setNodeRef} style={style} className="select-none">
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="cursor-grab touch-none text-muted-foreground/50 hover:text-muted-foreground -ml-1 shrink-0"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-3.5" />
        </button>
        <span>{column.label}</span>
      </div>
    </TableHead>
  );
}

export function DraggableTableHeader({
  columns,
  onReorder,
  extraHeads,
}: DraggableTableHeaderProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const columnIds = useMemo(() => columns.map((c) => c.id), [columns]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      onReorder(active.id as string, over.id as string);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <TableHeader>
        <TableRow>
          <SortableContext
            items={columnIds}
            strategy={horizontalListSortingStrategy}
          >
            {columns.map((col) => (
              <SortableTableHead key={col.id} column={col} />
            ))}
          </SortableContext>
          {extraHeads}
        </TableRow>
      </TableHeader>
    </DndContext>
  );
}
