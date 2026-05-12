"use client";

import type { ImportGscKeywordState } from "@/lib/actions/gsc/import-keywords";
import type { GscQueryCandidate } from "@/lib/services/gsc-query-import.service";

import { useActionState, useMemo, useState, useTransition } from "react";

import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  fetchGscKeywordCandidatesAction,
  importGscKeywordsAction,
} from "@/lib/actions/gsc/import-keywords";
import { idleState } from "@/lib/actions/types";

interface GscKeywordImportPanelProps {
  clientId: string;
  defaultDomainId?: string;
  domains: { id: string; url: string }[];
  hasGscConnection: boolean;
  hasRequiredScope: boolean;
}

const DEFAULT_DAYS = 28;
const DEFAULT_LIMIT = 50;

export function GscKeywordImportPanel({
  clientId,
  defaultDomainId,
  domains,
  hasGscConnection,
  hasRequiredScope,
}: GscKeywordImportPanelProps) {
  const [candidates, setCandidates] = useState<GscQueryCandidate[]>([]);
  const [selectedQueries, setSelectedQueries] = useState<string[]>([]);
  const [isFetching, startFetchTransition] = useTransition();
  const action = importGscKeywordsAction.bind(null, clientId);
  const [state, formAction, isImporting] = useActionState(action, idleState);

  const selectableCandidates = useMemo(
    () => candidates.filter((candidate) => !candidate.alreadyTracked),
    [candidates]
  );
  const selectedSet = useMemo(
    () => new Set(selectedQueries),
    [selectedQueries]
  );
  const canFetch = hasGscConnection && hasRequiredScope && domains.length > 0;

  function handleFetch() {
    startFetchTransition(async () => {
      const result = await fetchGscKeywordCandidatesAction(
        clientId,
        DEFAULT_DAYS,
        DEFAULT_LIMIT
      );
      if (result.status === "error") {
        toast.error(result.formError);
        return;
      }
      setCandidates(result.candidates);
      setSelectedQueries(getNewCandidateQueries(result.candidates));
      toast.success(`Fetched ${result.candidates.length} GSC queries.`);
    });
  }

  function toggleQuery(query: string, checked: boolean) {
    setSelectedQueries((current) => {
      if (checked) {
        return current.includes(query) ? current : [...current, query];
      }
      return current.filter((item) => item !== query);
    });
  }

  function toggleAll(checked: boolean) {
    setSelectedQueries(
      checked ? selectableCandidates.map((candidate) => candidate.query) : []
    );
  }

  return (
    <Card className="bg-card/95">
      <CardHeader>
        <CardTitle>Import from Google Search Console</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <p className="text-muted-foreground text-sm">
          Fetch top Search Console queries from the connected property and turn
          selected queries into tracked keywords. Imported terms are tagged with
          <span className="font-mono"> gsc-import</span>.
        </p>

        <ImportReadinessAlerts
          domainCount={domains.length}
          hasGscConnection={hasGscConnection}
          hasRequiredScope={hasRequiredScope}
        />

        <div>
          <Button disabled={!canFetch || isFetching} onClick={handleFetch}>
            {isFetching ? "Fetching GSC queries…" : "Fetch GSC queries"}
          </Button>
        </div>

        {candidates.length > 0 ? (
          <form action={formAction} className="flex flex-col gap-5">
            <DomainSelect
              defaultDomainId={defaultDomainId}
              domainError={
                state.status === "error"
                  ? state.fieldErrors?.domainId?.[0]
                  : undefined
              }
              domains={domains}
            />

            {selectedQueries.map((query) => (
              <input key={query} name="queries" type="hidden" value={query} />
            ))}

            <CandidateTable
              candidates={candidates}
              onToggleAll={toggleAll}
              onToggleQuery={toggleQuery}
              selectableCount={selectableCandidates.length}
              selectedQueries={selectedQueries}
              selectedSet={selectedSet}
            />

            {state.status === "error" && state.fieldErrors?.queries ? (
              <p className="text-destructive text-sm">
                {state.fieldErrors.queries[0]}
              </p>
            ) : null}

            <ImportResultAlert state={state} />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-muted-foreground text-sm">
                {selectedQueries.length} of {selectableCandidates.length} new
                queries selected.
              </p>
              <Button disabled={isImporting || selectedQueries.length === 0}>
                {isImporting ? "Importing…" : "Import selected keywords"}
              </Button>
            </div>
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}

function getNewCandidateQueries(candidates: GscQueryCandidate[]): string[] {
  return candidates
    .filter((candidate) => !candidate.alreadyTracked)
    .map((candidate) => candidate.query);
}

function ImportReadinessAlerts({
  domainCount,
  hasGscConnection,
  hasRequiredScope,
}: {
  domainCount: number;
  hasGscConnection: boolean;
  hasRequiredScope: boolean;
}) {
  return (
    <>
      {hasGscConnection ? null : (
        <Alert variant="destructive">
          <AlertTitle>Connect GSC first</AlertTitle>
          <AlertDescription>
            Connect this client to Google Search Console before importing
            queries.
          </AlertDescription>
        </Alert>
      )}

      {hasGscConnection && !hasRequiredScope ? (
        <Alert variant="destructive">
          <AlertTitle>Search Console scope missing</AlertTitle>
          <AlertDescription>
            Reconnect Google Search Console and approve read access before
            importing queries.
          </AlertDescription>
        </Alert>
      ) : null}

      {domainCount === 0 ? (
        <Alert variant="destructive">
          <AlertTitle>Add a domain first</AlertTitle>
          <AlertDescription>
            Imported keywords need to belong to a domain. Add at least one
            domain before importing GSC queries.
          </AlertDescription>
        </Alert>
      ) : null}
    </>
  );
}

function DomainSelect({
  defaultDomainId,
  domainError,
  domains,
}: {
  defaultDomainId?: string;
  domainError?: string;
  domains: { id: string; url: string }[];
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="gsc-import-domain">Import into domain</Label>
      <NativeSelect
        className="w-full md:max-w-md"
        defaultValue={defaultDomainId ?? domains[0]?.id}
        id="gsc-import-domain"
        name="domainId"
      >
        {domains.map((domain) => (
          <NativeSelectOption key={domain.id} value={domain.id}>
            {domain.url}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      {domainError ? (
        <p className="text-destructive text-sm">{domainError}</p>
      ) : null}
    </div>
  );
}

function CandidateTable({
  candidates,
  onToggleAll,
  onToggleQuery,
  selectableCount,
  selectedQueries,
  selectedSet,
}: {
  candidates: GscQueryCandidate[];
  onToggleAll: (checked: boolean) => void;
  onToggleQuery: (query: string, checked: boolean) => void;
  selectableCount: number;
  selectedQueries: string[];
  selectedSet: Set<string>;
}) {
  return (
    <div className="border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                aria-label="Select all importable queries"
                checked={
                  selectableCount > 0 &&
                  selectedQueries.length === selectableCount
                }
                disabled={selectableCount === 0}
                onCheckedChange={(checked) => onToggleAll(Boolean(checked))}
              />
            </TableHead>
            <TableHead>Query</TableHead>
            <TableHead>Clicks</TableHead>
            <TableHead>Impressions</TableHead>
            <TableHead>Avg position</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {candidates.map((candidate) => (
            <CandidateRow
              candidate={candidate}
              isSelected={selectedSet.has(candidate.query)}
              key={candidate.query}
              onToggle={onToggleQuery}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function CandidateRow({
  candidate,
  isSelected,
  onToggle,
}: {
  candidate: GscQueryCandidate;
  isSelected: boolean;
  onToggle: (query: string, checked: boolean) => void;
}) {
  return (
    <TableRow>
      <TableCell>
        <Checkbox
          aria-label={`Select ${candidate.query}`}
          checked={isSelected}
          disabled={candidate.alreadyTracked}
          onCheckedChange={(checked) =>
            onToggle(candidate.query, Boolean(checked))
          }
        />
      </TableCell>
      <TableCell className="whitespace-normal">
        <span className="font-medium">{candidate.query}</span>
      </TableCell>
      <TableCell>{candidate.clicks}</TableCell>
      <TableCell>{candidate.impressions}</TableCell>
      <TableCell>
        {candidate.avgPosition === null
          ? "—"
          : candidate.avgPosition.toFixed(1)}
      </TableCell>
      <TableCell>
        {candidate.alreadyTracked ? (
          <Badge variant="secondary">tracked</Badge>
        ) : (
          <Badge variant="outline">new</Badge>
        )}
      </TableCell>
    </TableRow>
  );
}

function ImportResultAlert({ state }: { state: ImportGscKeywordState }) {
  if (state.status === "error" && state.formError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Something went wrong</AlertTitle>
        <AlertDescription>{state.formError}</AlertDescription>
      </Alert>
    );
  }

  if (state.status === "success" && state.summary) {
    return (
      <Alert>
        <AlertTitle>
          {state.summary.created} imported · {state.summary.skippedCount}{" "}
          skipped
        </AlertTitle>
        <AlertDescription>
          {state.summary.skippedCount === 0
            ? "Selected GSC queries are now tracked keywords."
            : `Already existed: ${state.summary.duplicateTerms
                .slice(0, 5)
                .join(", ")}${
                state.summary.duplicateTerms.length > 5 ? "…" : ""
              }`}
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
