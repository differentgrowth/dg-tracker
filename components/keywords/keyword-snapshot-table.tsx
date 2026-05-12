"use client";

import type { Route } from "next";

import { useMemo, useState } from "react";
import Link from "next/link";

import {
  RiArrowDownLine,
  RiArrowDropRightLine,
  RiArrowUpDownLine,
  RiArrowUpLine,
} from "@remixicon/react";

import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/dashboard/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRankingPosition } from "@/lib/ranking-position";
import { cn } from "@/lib/utils";

export interface KeywordSnapshotTableRow {
  category: string | null;
  clicks: number | null;
  ctr: number | null;
  detailHref: Route;
  domainUrl: string;
  id: string;
  latestPosition: number | null;
  priority: string | null;
  tags: string[];
  term: string;
}

type SortKey =
  | "term"
  | "domainUrl"
  | "priority"
  | "latestPosition"
  | "clicks"
  | "ctr";
type SortDirection = "asc" | "desc";
type PresentSortValue = string | number;

interface KeywordSnapshotTableProps {
  rows: KeywordSnapshotTableRow[];
}

const columns: { key: SortKey; label: string }[] = [
  { key: "term", label: "Keyword" },
  { key: "domainUrl", label: "Domain" },
  { key: "priority", label: "Priority" },
  { key: "latestPosition", label: "Position" },
  { key: "clicks", label: "Clicks" },
  { key: "ctr", label: "CTR" },
];

const priorityRank: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export function KeywordSnapshotTable({ rows }: KeywordSnapshotTableProps) {
  const [sort, setSort] = useState<{ direction: SortDirection; key: SortKey }>({
    direction: "desc",
    key: "priority",
  });

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => compareRows(a, b, sort.key, sort.direction)),
    [rows, sort]
  );

  function toggleSort(key: SortKey) {
    setSort((current) => ({
      key,
      direction:
        current.key === key
          ? getOppositeDirection(current.direction)
          : getDefaultDirection(key),
    }));
  }

  return (
    <>
      <div className="hidden md:block">
        <DataTable>
          <DataTableHeader>
            <DataTableRow>
              <DataTableHead className="w-10">
                <span className="sr-only">Chart</span>
              </DataTableHead>
              {columns.map((column) => (
                <DataTableHead
                  aria-sort={getAriaSort(column.key, sort)}
                  key={column.key}
                >
                  <SortButton
                    activeDirection={
                      sort.key === column.key ? sort.direction : null
                    }
                    label={column.label}
                    onClick={() => toggleSort(column.key)}
                    sortKey={column.key}
                  />
                </DataTableHead>
              ))}
            </DataTableRow>
          </DataTableHeader>
          <DataTableBody>
            {sortedRows.map((row) => (
              <DataTableRow key={row.id}>
                <DataTableCell>
                  <Button
                    aria-label={`View chart for ${row.term}`}
                    render={<Link href={row.detailHref} />}
                    size="icon"
                    variant="ghost"
                  >
                    <RiArrowDropRightLine
                      aria-hidden="true"
                      className="size-4"
                    />
                  </Button>
                </DataTableCell>
                <DataTableCell>
                  <p className="font-medium">{row.term}</p>
                  <p className="text-muted-foreground text-xs">
                    {row.tags.length > 0 ? row.tags.join(", ") : "No tags"}
                  </p>
                </DataTableCell>
                <DataTableCell>
                  <p className="max-w-52 truncate">{row.domainUrl}</p>
                </DataTableCell>
                <DataTableCell>
                  <Badge variant="secondary">{row.priority || "unset"}</Badge>
                </DataTableCell>
                <DataTableCell>
                  {formatRankingPosition(row.latestPosition)}
                </DataTableCell>
                <DataTableCell>
                  {formatNullableNumber(row.clicks)}
                </DataTableCell>
                <DataTableCell>{formatCtr(row.ctr)}</DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      </div>

      <div className="grid gap-3 md:hidden">
        <MobileSortControls
          onSortChange={toggleSort}
          sortDirection={sort.direction}
          sortKey={sort.key}
        />
        {sortedRows.map((row) => (
          <article className="border p-4" key={row.id}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-2">
                <Button
                  aria-label={`View chart for ${row.term}`}
                  className="mt-0.5"
                  render={<Link href={row.detailHref} />}
                  size="icon-xs"
                  variant="ghost"
                >
                  <RiArrowDropRightLine aria-hidden="true" className="size-4" />
                </Button>
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-sm">{row.term}</h3>
                  <p className="truncate text-muted-foreground text-xs">
                    {row.domainUrl}
                  </p>
                </div>
              </div>
              <Badge variant="secondary">{row.priority || "unset"}</Badge>
            </div>
            <p className="mt-3 text-muted-foreground text-xs">
              {row.category ?? "Uncategorized"}
              {row.tags.length > 0 ? ` · ${row.tags.join(", ")}` : ""}
            </p>
            <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
              <Metric
                label="Position"
                value={formatRankingPosition(row.latestPosition)}
              />
              <Metric label="Clicks" value={formatNullableNumber(row.clicks)} />
              <Metric label="CTR" value={formatCtr(row.ctr)} />
            </dl>
          </article>
        ))}
      </div>
    </>
  );
}

function SortButton({
  activeDirection,
  label,
  onClick,
  sortKey,
}: {
  activeDirection: SortDirection | null;
  label: string;
  onClick: () => void;
  sortKey: SortKey;
}) {
  let Icon = RiArrowUpDownLine;
  if (activeDirection === "asc") {
    Icon = RiArrowUpLine;
  }
  if (activeDirection === "desc") {
    Icon = RiArrowDownLine;
  }

  return (
    <button
      aria-label={getSortLabel(label, sortKey, activeDirection)}
      className={cn(
        "inline-flex items-center gap-1.5 text-left transition-colors hover:text-foreground",
        activeDirection && "text-foreground"
      )}
      onClick={onClick}
      type="button"
    >
      {label}
      <Icon aria-hidden="true" className="size-3.5" />
    </button>
  );
}

function MobileSortControls({
  onSortChange,
  sortDirection,
  sortKey,
}: {
  onSortChange: (key: SortKey) => void;
  sortDirection: SortDirection;
  sortKey: SortKey;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {columns.map((column) => (
        <Button
          aria-pressed={sortKey === column.key}
          className="shrink-0"
          key={column.key}
          onClick={() => onSortChange(column.key)}
          size="xs"
          variant={sortKey === column.key ? "secondary" : "outline"}
        >
          {column.label}
          {sortKey === column.key && sortDirection === "asc" ? (
            <RiArrowUpLine aria-hidden="true" />
          ) : null}
          {sortKey === column.key && sortDirection === "desc" ? (
            <RiArrowDownLine aria-hidden="true" />
          ) : null}
        </Button>
      ))}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-1 font-medium tabular-nums">{value}</dd>
    </div>
  );
}

function compareRows(
  a: KeywordSnapshotTableRow,
  b: KeywordSnapshotTableRow,
  key: SortKey,
  direction: SortDirection
) {
  const aValue = getSortValue(a, key);
  const bValue = getSortValue(b, key);

  if (aValue === null && bValue === null) {
    return a.term.localeCompare(b.term);
  }
  if (aValue === null) {
    return 1;
  }
  if (bValue === null) {
    return -1;
  }

  const result = compareValues(aValue, bValue);

  if (result !== 0) {
    return direction === "asc" ? result : -result;
  }

  return a.term.localeCompare(b.term);
}

function getSortValue(row: KeywordSnapshotTableRow, key: SortKey) {
  if (key === "priority") {
    return priorityRank[row.priority ?? ""] ?? 0;
  }

  return row[key];
}

function compareValues(a: PresentSortValue, b: PresentSortValue) {
  if (typeof a === "number" && typeof b === "number") {
    return a - b;
  }

  return String(a).localeCompare(String(b));
}

function getAriaSort(
  key: SortKey,
  sort: { direction: SortDirection; key: SortKey }
) {
  if (sort.key !== key) {
    return "none";
  }

  return sort.direction === "asc" ? "ascending" : "descending";
}

function getDefaultDirection(key: SortKey): SortDirection {
  if (key === "term" || key === "domainUrl" || key === "latestPosition") {
    return "asc";
  }

  return "desc";
}

function getOppositeDirection(direction: SortDirection): SortDirection {
  return direction === "asc" ? "desc" : "asc";
}

function getSortLabel(
  label: string,
  key: SortKey,
  activeDirection: SortDirection | null
) {
  const nextDirection = activeDirection
    ? getOppositeDirection(activeDirection)
    : getDefaultDirection(key);

  return `Sort by ${label} ${nextDirection === "asc" ? "ascending" : "descending"}`;
}

function formatNullableNumber(value: number | null) {
  return value === null ? "—" : value.toLocaleString("en");
}

function formatCtr(value: number | null) {
  return value === null ? "—" : `${(value * 100).toFixed(1)}%`;
}
