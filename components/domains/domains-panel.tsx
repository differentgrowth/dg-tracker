"use client";

import { useState } from "react";

import { DomainForm } from "@/components/domains/domain-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

interface DomainRow {
  id: string;
  keywordCount: number;
  notes: string | null;
  url: string;
}

interface DomainsPanelProps {
  clientId: string;
  domains: DomainRow[];
}

export function DomainsPanel({ clientId, domains }: DomainsPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
      <Card className="bg-card/95">
        <CardHeader>
          <CardTitle>Add a domain</CardTitle>
          <CardDescription>
            Domains are the unit GSC sync hangs off. Add one per property.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DomainForm clientId={clientId} mode="create" />
        </CardContent>
      </Card>

      <Card className="bg-card/95">
        <CardHeader>
          <CardTitle>{domains.length} domains</CardTitle>
          <CardDescription>
            Edit URL or notes inline. Removing a domain ships with the keyword
            UX in Phase 3 — until then, edit is the only mutation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {domains.length === 0 ? (
            <Empty className="border">
              <EmptyHeader>
                <EmptyTitle>No domains yet</EmptyTitle>
                <EmptyDescription>
                  Add the client&apos;s first domain on the left.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ul className="divide-y border">
              {domains.map((domain) => (
                <li className="px-4 py-3" key={domain.id}>
                  {editingId === domain.id ? (
                    <DomainForm
                      clientId={clientId}
                      defaults={{ url: domain.url, notes: domain.notes }}
                      domainId={domain.id}
                      mode="edit"
                      onDone={() => setEditingId(null)}
                    />
                  ) : (
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{domain.url}</p>
                        <p className="text-muted-foreground text-xs">
                          {domain.keywordCount} keywords
                          {domain.notes ? ` · ${domain.notes}` : ""}
                        </p>
                      </div>
                      <Button
                        onClick={() => setEditingId(domain.id)}
                        size="sm"
                        variant="outline"
                      >
                        Edit
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
