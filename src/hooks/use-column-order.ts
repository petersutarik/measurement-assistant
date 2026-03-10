"use client";

import { useState, useCallback, useEffect } from "react";

export interface ColumnDef {
  id: string;
  label: string;
  alwaysVisible?: boolean;
}

interface StoredPrefs {
  columnOrder: string[];
  hiddenColumns: string[];
  groupBy: string | null;
}

// Migrate old format { visibleColumns, groupBy } to new format
function migratePrefs(
  raw: string,
  allColumnIds: string[]
): StoredPrefs | null {
  try {
    const parsed = JSON.parse(raw);
    // New format
    if (parsed.columnOrder) return parsed as StoredPrefs;
    // Old format
    if (parsed.visibleColumns) {
      const visible = new Set<string>(parsed.visibleColumns);
      return {
        columnOrder: allColumnIds,
        hiddenColumns: allColumnIds.filter((id) => !visible.has(id)),
        groupBy: parsed.groupBy ?? null,
      };
    }
  } catch {
    // ignore
  }
  return null;
}

export function useColumnOrder(
  storageKey: string,
  allColumns: ColumnDef[],
  defaultVisibleIds: string[]
) {
  const allColumnIds = allColumns.map((c) => c.id);
  const defaultHidden = allColumnIds.filter(
    (id) => !defaultVisibleIds.includes(id) && !allColumns.find((c) => c.id === id)?.alwaysVisible
  );

  const [columnOrder, setColumnOrder] = useState<string[]>(allColumnIds);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>(defaultHidden);
  const [groupBy, setGroupBy] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Load from localStorage after mount
  useEffect(() => {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const prefs = migratePrefs(raw, allColumnIds);
      if (prefs) {
        // Merge in any new columns not in stored order
        const storedSet = new Set(prefs.columnOrder);
        const merged = [
          ...prefs.columnOrder.filter((id) => allColumnIds.includes(id)),
          ...allColumnIds.filter((id) => !storedSet.has(id)),
        ];
        setColumnOrder(merged);
        setHiddenColumns(prefs.hiddenColumns.filter((id) => allColumnIds.includes(id)));
        setGroupBy(prefs.groupBy);
      }
    }
    setHydrated(true);
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // Persist on change
  useEffect(() => {
    if (!hydrated) return;
    const prefs: StoredPrefs = { columnOrder, hiddenColumns, groupBy };
    localStorage.setItem(storageKey, JSON.stringify(prefs));
  }, [columnOrder, hiddenColumns, groupBy, hydrated, storageKey]);

  // Sync when allColumns changes (e.g. custom fields added/removed)
  useEffect(() => {
    if (!hydrated) return;
    setColumnOrder((prev) => {
      const prevSet = new Set(prev);
      const validPrev = prev.filter((id) => allColumnIds.includes(id));
      const newIds = allColumnIds.filter((id) => !prevSet.has(id));
      if (newIds.length === 0 && validPrev.length === prev.length) return prev;
      return [...validPrev, ...newIds];
    });
    setHiddenColumns((prev) => prev.filter((id) => allColumnIds.includes(id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allColumnIds.join(","), hydrated]);

  const isVisible = useCallback(
    (id: string) => {
      const col = allColumns.find((c) => c.id === id);
      if (col?.alwaysVisible) return true;
      return !hiddenColumns.includes(id);
    },
    [hiddenColumns, allColumns]
  );

  const toggleColumn = useCallback(
    (id: string) => {
      setHiddenColumns((prev) => {
        if (prev.includes(id)) {
          return prev.filter((c) => c !== id);
        } else {
          if (groupBy === id) setGroupBy(null);
          return [...prev, id];
        }
      });
    },
    [groupBy]
  );

  const moveColumn = useCallback((activeId: string, overId: string) => {
    setColumnOrder((prev) => {
      const oldIndex = prev.indexOf(activeId);
      const newIndex = prev.indexOf(overId);
      if (oldIndex === -1 || newIndex === -1) return prev;
      const next = [...prev];
      next.splice(oldIndex, 1);
      next.splice(newIndex, 0, activeId);
      return next;
    });
  }, []);

  const visibleColumns = columnOrder
    .filter((id) => isVisible(id))
    .map((id) => allColumns.find((c) => c.id === id)!)
    .filter(Boolean);

  const groupableColumns = visibleColumns.filter((c) => !c.alwaysVisible);

  return {
    columnOrder,
    visibleColumns,
    hiddenColumns,
    groupBy,
    groupableColumns,
    hydrated,
    isVisible,
    toggleColumn,
    moveColumn,
    setGroupBy,
  };
}
