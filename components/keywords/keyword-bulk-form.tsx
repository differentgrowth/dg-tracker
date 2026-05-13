"use client";

import {
  type ChangeEvent,
  type KeyboardEvent,
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";

import { KeywordBadge } from "@/components/keywords/keyword-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { bulkCreateKeywordsAction } from "@/lib/actions/keywords/bulk-create-keywords";
import { idleState } from "@/lib/actions/types";
import { KEYWORD_PRIORITIES } from "@/lib/validators/keyword";

interface KeywordBulkFormProps {
  clientId: string;
  defaultDomainId?: string;
  domains: { id: string; url: string }[];
}

export function KeywordBulkForm({
  clientId,
  domains,
  defaultDomainId,
}: KeywordBulkFormProps) {
  const action = bulkCreateKeywordsAction.bind(null, clientId);
  const [state, formAction, isPending] = useActionState(action, idleState);
  const formRef = useRef<HTMLFormElement>(null);
  const [selectResetKey, setSelectResetKey] = useState(0);
  const [keywordTerms, setKeywordTerms] = useState<string[]>([]);
  const [keywordDraft, setKeywordDraft] = useState("");

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
      setSelectResetKey((current) => current + 1);
      setKeywordTerms([]);
      setKeywordDraft("");
    }
  }, [state.status]);

  const fieldError = (
    field:
      | "domainId"
      | "terms"
      | "priority"
      | "tags"
      | "category"
      | "targetPosition"
      | "targetUrl"
  ) => (state.status === "error" ? state.fieldErrors?.[field]?.[0] : undefined);

  if (domains.length === 0) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Add a domain first</AlertTitle>
        <AlertDescription>
          Keywords are tracked per domain. Add at least one domain to this
          client before onboarding keywords.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-5"
      noValidate
      ref={formRef}
    >
      <div className="grid gap-5 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="domainId">
            Domain
            <span aria-hidden="true" className="ml-1 text-destructive">
              *
            </span>
          </Label>
          <Select
            defaultValue={defaultDomainId ?? domains[0]?.id}
            id="domainId"
            items={domains.map((domain) => ({
              label: domain.url,
              value: domain.id,
            }))}
            key={`domain-${selectResetKey}-${defaultDomainId ?? "default"}`}
            name="domainId"
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {domains.map((domain) => (
                  <SelectItem key={domain.id} value={domain.id}>
                    {domain.url}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          {fieldError("domainId") ? (
            <p className="text-destructive text-sm">{fieldError("domainId")}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="priority">Priority</Label>
          <Select
            defaultValue=""
            id="priority"
            items={[
              { label: "Unset", value: "" },
              ...KEYWORD_PRIORITIES.map((priority) => ({
                label: priority,
                value: priority,
              })),
            ]}
            key={`priority-${selectResetKey}`}
            name="priority"
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="">Unset</SelectItem>
                {KEYWORD_PRIORITIES.map((priority) => (
                  <SelectItem key={priority} value={priority}>
                    {priority}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          {fieldError("priority") ? (
            <p className="text-destructive text-sm">{fieldError("priority")}</p>
          ) : null}
        </div>
      </div>

      <KeywordTermsField
        draft={keywordDraft}
        error={fieldError("terms")}
        onDraftChange={setKeywordDraft}
        onTermsChange={setKeywordTerms}
        terms={keywordTerms}
      />

      <div className="grid gap-5 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="tags">Tags</Label>
          <Input
            id="tags"
            name="tags"
            placeholder="commercial, brand"
            type="text"
          />
          <p className="text-muted-foreground text-xs">
            Comma separated. Applied to every keyword in this batch.
          </p>
          {fieldError("tags") ? (
            <p className="text-destructive text-sm">{fieldError("tags")}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            name="category"
            placeholder="commercial"
            type="text"
          />
          {fieldError("category") ? (
            <p className="text-destructive text-sm">{fieldError("category")}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="targetPosition">Target position</Label>
          <Input
            id="targetPosition"
            inputMode="numeric"
            max={100}
            min={1}
            name="targetPosition"
            placeholder="3"
            type="number"
          />
          {fieldError("targetPosition") ? (
            <p className="text-destructive text-sm">
              {fieldError("targetPosition")}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="targetUrl">Target URL</Label>
          <Input
            id="targetUrl"
            name="targetUrl"
            placeholder="https://acme.com/pricing"
            type="text"
          />
          {fieldError("targetUrl") ? (
            <p className="text-destructive text-sm">
              {fieldError("targetUrl")}
            </p>
          ) : null}
        </div>
      </div>

      {state.status === "error" && state.formError ? (
        <Alert variant="destructive">
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>{state.formError}</AlertDescription>
        </Alert>
      ) : null}

      {state.status === "success" && state.summary ? (
        <Alert>
          <AlertTitle>
            {state.summary.created} added · {state.summary.skippedCount} skipped
          </AlertTitle>
          <AlertDescription>
            {state.summary.skippedCount === 0 ? (
              "Every keyword in the batch was new for the selected domain."
            ) : (
              <DuplicateKeywordBadges terms={state.summary.duplicateTerms} />
            )}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button disabled={isPending} type="submit">
          {isPending ? "Saving…" : "Add keywords"}
        </Button>
      </div>
    </form>
  );
}

interface KeywordTermsFieldProps {
  draft: string;
  error?: string;
  onDraftChange: (draft: string) => void;
  onTermsChange: (terms: string[]) => void;
  terms: string[];
}

const keywordDraftSeparatorPattern = /[\r\n,]+/;
const whitespacePattern = /\s+/g;

function KeywordTermsField({
  draft,
  error,
  onDraftChange,
  onTermsChange,
  terms,
}: KeywordTermsFieldProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const submittedTerms = serializeKeywordTerms(terms, draft);

  function commitDraft() {
    const term = normalizeKeywordTerm(draft);
    if (term) {
      onTermsChange(appendUniqueTerms(terms, [term]));
    }
    onDraftChange("");
  }

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    const nextValue = event.target.value;

    if (!keywordDraftSeparatorPattern.test(nextValue)) {
      onDraftChange(nextValue);
      return;
    }

    const parts = nextValue.split(keywordDraftSeparatorPattern);
    const nextDraft = parts.at(-1) ?? "";
    const completedTerms = parts.slice(0, -1).map(normalizeKeywordTerm);

    onTermsChange(appendUniqueTerms(terms, completedTerms));
    onDraftChange(nextDraft);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      commitDraft();
      return;
    }

    if (event.key === "Backspace" && draft.length === 0 && terms.length > 0) {
      event.preventDefault();
      const nextTerms = terms.slice(0, -1);
      const [lastTerm] = terms.slice(-1);

      onTermsChange(nextTerms);
      onDraftChange(lastTerm ?? "");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="terms">
        Keywords
        <span aria-hidden="true" className="ml-1 text-destructive">
          *
        </span>
      </Label>
      <input name="terms" type="hidden" value={submittedTerms} />
      <div className="min-h-32 border border-transparent border-b-input py-2 transition-colors focus-within:border-b-ring has-aria-invalid:border-b-destructive">
        <div className="flex flex-wrap items-center gap-2">
          {terms.map((term) => (
            <KeywordBadge key={term} term={term} />
          ))}
          <Textarea
            aria-invalid={Boolean(error)}
            className="min-h-8 min-w-60 flex-1 border-b-transparent py-1 focus-visible:border-b-transparent"
            id="terms"
            onBlur={commitDraft}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={
              terms.length === 0
                ? "One keyword per line or separated by commas"
                : "Add another keyword"
            }
            ref={textareaRef}
            rows={1}
            value={draft}
          />
        </div>
      </div>
      <p className="text-muted-foreground text-xs">
        Type a comma or press Enter to turn each keyword into a badge. Pasted
        keywords are trimmed, lowercased, deduplicated, and merged with existing
        terms for the selected domain.
      </p>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </div>
  );
}

function serializeKeywordTerms(terms: string[], draft: string) {
  const draftTerm = normalizeKeywordTerm(draft);
  const allTerms = draftTerm ? appendUniqueTerms(terms, [draftTerm]) : terms;

  return allTerms.join("\n");
}

function appendUniqueTerms(currentTerms: string[], nextTerms: string[]) {
  const seen = new Set(currentTerms);
  const result = [...currentTerms];

  for (const term of nextTerms) {
    if (!term || seen.has(term)) {
      continue;
    }
    seen.add(term);
    result.push(term);
  }

  return result;
}

function normalizeKeywordTerm(value: string) {
  return value.replace(whitespacePattern, " ").trim().toLowerCase();
}

function DuplicateKeywordBadges({ terms }: { terms: string[] }) {
  const visibleTerms = terms.slice(0, 5);

  return (
    <span className="flex flex-wrap items-center gap-1">
      <span>Already existed:</span>
      {visibleTerms.map((term) => (
        <KeywordBadge key={term} term={term} />
      ))}
      {terms.length > visibleTerms.length ? <span>…</span> : null}
    </span>
  );
}
