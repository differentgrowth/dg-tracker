"use client";

import { useState } from "react";

import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from "@/components/dashboard/data-table";
import { ArchiveKeywordButton } from "@/components/keywords/archive-keyword-button";
import { KeywordEditForm } from "@/components/keywords/keyword-edit-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface KeywordTableRow {
  category: string | null;
  domainUrl: string;
  id: string;
  lastCheckedAt: Date | null;
  latestPosition: number | null;
  notes: string | null;
  priority: string | null;
  status: string;
  tags: string[];
  targetPosition: number | null;
  targetUrl: string | null;
  term: string;
}

interface KeywordTableProps {
  clientId: string;
  rows: KeywordTableRow[];
}

export function KeywordTable({ clientId, rows }: KeywordTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <DataTable>
      <DataTableHeader>
        <DataTableRow>
          <DataTableHead>Keyword</DataTableHead>
          <DataTableHead>Domain</DataTableHead>
          <DataTableHead>Priority</DataTableHead>
          <DataTableHead>Tags</DataTableHead>
          <DataTableHead>Target</DataTableHead>
          <DataTableHead>Last position</DataTableHead>
          <DataTableHead>Last checked</DataTableHead>
          <DataTableHead className="text-right">Actions</DataTableHead>
        </DataTableRow>
      </DataTableHeader>
      <DataTableBody>
        {rows.map((row) => {
          const isEditing = editingId === row.id;

          if (isEditing) {
            return (
              <DataTableRow key={row.id}>
                <DataTableCell className="whitespace-normal" colSpan={8}>
                  <div className="flex flex-col gap-3">
                    <p className="font-medium text-sm">{row.term}</p>
                    <KeywordEditForm
                      clientId={clientId}
                      defaults={{
                        priority: row.priority,
                        tags: row.tags,
                        category: row.category,
                        targetPosition: row.targetPosition,
                        targetUrl: row.targetUrl,
                        notes: row.notes,
                      }}
                      keywordId={row.id}
                      onDone={() => setEditingId(null)}
                    />
                  </div>
                </DataTableCell>
              </DataTableRow>
            );
          }

          const isArchived = row.status === "archived";

          return (
            <DataTableRow
              className={isArchived ? "opacity-60" : undefined}
              key={row.id}
            >
              <DataTableCell>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{row.term}</p>
                  {isArchived ? (
                    <Badge variant="outline">archived</Badge>
                  ) : null}
                </div>
                {row.category ? (
                  <p className="text-muted-foreground text-xs">
                    {row.category}
                  </p>
                ) : null}
              </DataTableCell>
              <DataTableCell>
                <p className="truncate">{row.domainUrl}</p>
              </DataTableCell>
              <DataTableCell>
                <Badge variant="secondary">{row.priority || "unset"}</Badge>
              </DataTableCell>
              <DataTableCell className="whitespace-normal">
                {row.tags.length === 0 ? (
                  <span className="text-muted-foreground text-xs">—</span>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {row.tags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </DataTableCell>
              <DataTableCell>
                {row.targetPosition ? `top ${row.targetPosition}` : "—"}
                {row.targetUrl ? (
                  <p className="max-w-[200px] truncate text-muted-foreground text-xs">
                    {row.targetUrl}
                  </p>
                ) : null}
              </DataTableCell>
              <DataTableCell>{row.latestPosition ?? "—"}</DataTableCell>
              <DataTableCell>
                {row.lastCheckedAt
                  ? new Intl.DateTimeFormat("en", {
                      dateStyle: "medium",
                    }).format(row.lastCheckedAt)
                  : "—"}
              </DataTableCell>
              <DataTableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    onClick={() => setEditingId(row.id)}
                    size="sm"
                    variant="ghost"
                  >
                    Edit
                  </Button>
                  <ArchiveKeywordButton
                    clientId={clientId}
                    keywordId={row.id}
                    status={row.status}
                  />
                </div>
              </DataTableCell>
            </DataTableRow>
          );
        })}
      </DataTableBody>
    </DataTable>
  );
}
