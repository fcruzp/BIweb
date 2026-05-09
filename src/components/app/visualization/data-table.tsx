'use client';

import { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, ChevronLeft, ChevronRight, Download, FileSpreadsheet, FileJson, FileText } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { exportAsCSV, exportAsJSON, exportAsHTML, generateExportFilename } from '@/lib/export-utils';

interface DataTableProps {
  data: Array<Record<string, unknown>>;
  columns: string[];
  /** Optional title for export filenames */
  exportTitle?: string;
}

export function DataTable({ data, columns, exportTitle }: DataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  // Ensure columns is always a valid array
  const safeColumns = Array.isArray(columns) ? columns : (Array.isArray(data) && data.length > 0 ? Object.keys(data[0]) : []);

  const tableColumns = useMemo<ColumnDef<Record<string, unknown>>[]>(
    () =>
      safeColumns.map((col) => ({
        accessorKey: col,
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 -ml-3 text-xs font-medium"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            {col}
            <ArrowUpDown className="ml-1 h-3 w-3" />
          </Button>
        ),
        cell: ({ getValue }) => {
          const value = getValue();
          if (value === null || value === undefined)
            return <span className="text-muted-foreground">NULL</span>;
          const str = String(value);
          return str.length > 100 ? str.slice(0, 100) + '...' : str;
        },
      })),
    [safeColumns]
  );

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 15 },
    },
  });

  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 rounded-lg bg-muted/30">
        <p className="text-sm text-muted-foreground">No data to display</p>
      </div>
    );
  }

  const handleExportCSV = () => {
    exportAsCSV(data, safeColumns, generateExportFilename(exportTitle || 'datamind', 'csv'));
  };

  const handleExportJSON = () => {
    exportAsJSON(data, generateExportFilename(exportTitle || 'datamind', 'json'));
  };

  const handleExportExcel = () => {
    exportAsHTML(data, safeColumns, generateExportFilename(exportTitle || 'datamind', 'xls'), exportTitle);
  };

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border/50 overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-muted/50 hover:bg-muted/50">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="text-xs h-9">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-muted/30">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="text-xs py-2">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination + Export */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}-
          {Math.min(
            (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
            data.length
          )}{' '}
          of {data.length} rows
        </span>
        <div className="flex items-center gap-2">
          {/* Export dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 text-[11px] text-muted-foreground hover:text-foreground"
              >
                <Download className="h-3 w-3" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={handleExportCSV} className="gap-2 text-xs">
                <FileText className="h-3.5 w-3.5 text-emerald-500" />
                CSV (Comma-separated)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportExcel} className="gap-2 text-xs">
                <FileSpreadsheet className="h-3.5 w-3.5 text-blue-500" />
                Excel (.xls)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportJSON} className="gap-2 text-xs">
                <FileJson className="h-3.5 w-3.5 text-amber-500" />
                JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
