"use client";

import { useMemo, useState, type ReactNode } from "react";

export type Column<T> = {
  key: string;
  header: string;
  sortable?: boolean;
  accessor: (row: T) => string | number;
  render?: (row: T) => ReactNode;
};

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  onRowClick,
  pageSize = 10,
}: {
  columns: Column<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
  pageSize?: number;
}) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return rows;
    const withKeys = rows.map((row) => ({ row, value: col.accessor(row) }));
    withKeys.sort((a, b) => (a.value < b.value ? -1 : a.value > b.value ? 1 : 0));
    if (sortDir === "desc") withKeys.reverse();
    return withKeys.map((w) => w.row);
  }, [rows, sortKey, sortDir, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const clampedPage = Math.min(page, totalPages - 1);
  const pageRows = sorted.slice(clampedPage * pageSize, clampedPage * pageSize + pageSize);

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(0);
  }

  return (
    <div className="flex flex-col gap-2">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800 text-xs uppercase text-zinc-400">
            {columns.map((col) => (
              <th key={col.key} className="px-3 py-2">
                {col.sortable ? (
                  <button
                    type="button"
                    onClick={() => toggleSort(col.key)}
                    className="flex items-center gap-1 hover:text-zinc-700 dark:hover:text-zinc-200"
                  >
                    {col.header}
                    {sortKey === col.key && <span>{sortDir === "asc" ? "↑" : "↓"}</span>}
                  </button>
                ) : (
                  col.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pageRows.map((row) => (
            <tr
              key={row.id}
              onClick={() => onRowClick?.(row)}
              className={`border-b border-zinc-100 dark:border-zinc-800 last:border-0 ${
                onRowClick ? "cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50" : ""
              }`}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-3 py-2">
                  {col.render ? col.render(row) : col.accessor(row)}
                </td>
              ))}
            </tr>
          ))}
          {pageRows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-3 py-6 text-center text-xs text-zinc-400">
                No data.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1 text-xs text-zinc-500">
          <button
            type="button"
            disabled={clampedPage === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="rounded-full px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30"
          >
            ← Prev
          </button>
          <span>
            Page {clampedPage + 1} of {totalPages}
          </span>
          <button
            type="button"
            disabled={clampedPage >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            className="rounded-full px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
