"use client";

import { useActionState, useEffect, useRef } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
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

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
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
          <NativeSelect
            className="w-full"
            defaultValue={defaultDomainId ?? domains[0]?.id}
            id="domainId"
            key={defaultDomainId ?? "default"}
            name="domainId"
          >
            {domains.map((domain) => (
              <NativeSelectOption key={domain.id} value={domain.id}>
                {domain.url}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {fieldError("domainId") ? (
            <p className="text-destructive text-sm">{fieldError("domainId")}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="priority">Priority</Label>
          <NativeSelect
            className="w-full"
            defaultValue=""
            id="priority"
            name="priority"
          >
            <NativeSelectOption value="">Unset</NativeSelectOption>
            {KEYWORD_PRIORITIES.map((priority) => (
              <NativeSelectOption key={priority} value={priority}>
                {priority}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {fieldError("priority") ? (
            <p className="text-destructive text-sm">{fieldError("priority")}</p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="terms">
          Keywords
          <span aria-hidden="true" className="ml-1 text-destructive">
            *
          </span>
        </Label>
        <Textarea
          id="terms"
          name="terms"
          placeholder={"One keyword per line\nor separated by commas"}
          required
          rows={8}
        />
        <p className="text-muted-foreground text-xs">
          Pasted keywords are trimmed, lowercased, deduplicated, and merged with
          existing terms for the selected domain.
        </p>
        {fieldError("terms") ? (
          <p className="text-destructive text-sm">{fieldError("terms")}</p>
        ) : null}
      </div>

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
            {state.summary.skippedCount === 0
              ? "Every keyword in the batch was new for the selected domain."
              : `Already existed: ${state.summary.duplicateTerms
                  .slice(0, 5)
                  .join(
                    ", "
                  )}${state.summary.duplicateTerms.length > 5 ? "…" : ""}`}
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
