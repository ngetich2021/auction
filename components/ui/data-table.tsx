"use client";

import * as React from "react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type ColumnPinningState,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronDown, FileDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ImageThumbnails, isImageField } from "@/components/ui/image-thumbnails";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Modal } from "@/components/ui/Modal";
import { exportRowsToExcel } from "@/lib/exportExcel";
import { cn } from "@/lib/utils";

// Columns whose cells contain their own interactive controls (checkboxes, action buttons/menus)
// must not also trigger the row's "view details" click.
const NON_DETAIL_COLUMN_IDS = new Set(["select", "actions"]);

function formatDetailValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (value instanceof Date) return value.toLocaleString();
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function DefaultRowDetail({ row }: { row: unknown }) {
  const entries = Object.entries(row as Record<string, unknown>);
  return (
    <div className="flex flex-col gap-3 p-4">
      <h3 className="text-base font-semibold">Details</h3>
      <div className="flex flex-col gap-1">
        {entries.map(([key, value]) => (
          <div
            key={key}
            className="flex flex-col gap-0.5 border-b border-zinc-100 py-1.5 text-sm last:border-0 dark:border-zinc-800 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
          >
            <span className="shrink-0 text-zinc-400">{key}</span>
            {isImageField(key, value) ? (
              <ImageThumbnails value={value} />
            ) : (
              <span className="break-all font-medium sm:text-right">{formatDetailValue(value)}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function resolveColumnId(col: ColumnDef<unknown, unknown>): string | undefined {
  if (col.id) return col.id;
  const accessorKey = (col as { accessorKey?: unknown }).accessorKey;
  return typeof accessorKey === "string" ? accessorKey : undefined;
}

const serialNumberColumn: ColumnDef<unknown, unknown> = {
  id: "#",
  header: "#",
  cell: ({ row, table }) => {
    const { pageIndex, pageSize } = table.getState().pagination;
    return <span className="text-muted-foreground">{pageIndex * pageSize + row.index + 1}</span>;
  },
  enableSorting: false,
  enableHiding: false,
};

function humanizeColumnId(id: string): string {
  const spaced = id.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[._]/g, " ");
  return (spaced.charAt(0).toUpperCase() + spaced.slice(1)).trim();
}

function formatExportValue(value: unknown): string | number | boolean {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toLocaleString();
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

const NON_EXPORT_COLUMN_IDS = new Set(["#", "select", "actions"]);

export function DataTable<TData>({
  columns,
  data,
  filterColumnId,
  filterPlaceholder = "Filter…",
  emptyMessage = "No data.",
  enableRowSelection = true,
  renderRowDetail,
  exportFilename = "export",
}: {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  filterColumnId?: string;
  filterPlaceholder?: string;
  emptyMessage?: string;
  enableRowSelection?: boolean;
  renderRowDetail?: (row: TData) => React.ReactNode;
  exportFilename?: string;
}) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [detailRow, setDetailRow] = React.useState<TData | null>(null);

  const columnsWithSerial = React.useMemo(
    () => [serialNumberColumn as ColumnDef<TData, unknown>, ...columns],
    [columns]
  );

  // Pin the leading serial/select utility columns plus the first real (name/title) column so
  // they stay put on horizontal overflow while the rest of the table scrolls underneath.
  const pinnedLeftIds = React.useMemo(() => {
    const firstReal = (columns as ColumnDef<unknown, unknown>[]).find((c) => {
      const id = resolveColumnId(c);
      return id && !NON_DETAIL_COLUMN_IDS.has(id);
    });
    return ["#", "select", firstReal ? resolveColumnId(firstReal) : undefined].filter(
      (id): id is string => !!id
    );
  }, [columns]);

  const table = useReactTable({
    data,
    columns: columnsWithSerial,
    enableColumnPinning: true,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: { sorting, columnFilters, columnVisibility, rowSelection },
    initialState: { columnPinning: { left: pinnedLeftIds } as ColumnPinningState },
  });

  function handleExport() {
    const exportColumns = table.getVisibleLeafColumns().filter((c) => !NON_EXPORT_COLUMN_IDS.has(c.id));
    const rows = table.getFilteredRowModel().rows.map((row) => {
      const record: Record<string, unknown> = {};
      for (const col of exportColumns) {
        record[humanizeColumnId(col.id)] = formatExportValue(row.getValue(col.id));
      }
      return record;
    });
    exportRowsToExcel(exportFilename, rows);
  }

  if (data.length === 0) {
    return <p className="text-sm text-zinc-500">{emptyMessage}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        {filterColumnId && (
          <Input
            placeholder={filterPlaceholder}
            value={(table.getColumn(filterColumnId)?.getFilterValue() as string) ?? ""}
            onChange={(e) => table.getColumn(filterColumnId)?.setFilterValue(e.target.value)}
            className="max-w-xs"
          />
        )}
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" onClick={handleExport}>
            <FileDown className="size-3.5" /> Download Excel
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline">
                  Columns <ChevronDown className="size-3.5" />
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    className="capitalize"
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const pinned = header.column.getIsPinned();
                  return (
                    <TableHead
                      key={header.id}
                      className={cn(pinned && "max-md:sticky max-md:z-20 max-md:bg-background")}
                      style={pinned ? { left: header.column.getStart("left") } : undefined}
                    >
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
                onClick={() => setDetailRow(row.original)}
                className="group cursor-pointer"
              >
                {row.getVisibleCells().map((cell) => {
                  const pinned = cell.column.getIsPinned();
                  return (
                    <TableCell
                      key={cell.id}
                      onClick={NON_DETAIL_COLUMN_IDS.has(cell.column.id) ? (e) => e.stopPropagation() : undefined}
                      className={cn(
                        pinned &&
                          "max-md:sticky max-md:z-20 max-md:bg-background max-md:group-hover:bg-muted/50 max-md:group-data-[state=selected]:bg-muted"
                      )}
                      style={pinned ? { left: cell.column.getStart("left") } : undefined}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {detailRow && (
        <Modal onClose={() => setDetailRow(null)}>
          {renderRowDetail ? renderRowDetail(detailRow) : <DefaultRowDetail row={detailRow} />}
        </Modal>
      )}

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        {enableRowSelection ? (
          <span>
            {table.getFilteredSelectedRowModel().rows.length} of {table.getFilteredRowModel().rows.length} row(s)
            selected.
          </span>
        ) : (
          <span>{table.getFilteredRowModel().rows.length} row(s).</span>
        )}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
