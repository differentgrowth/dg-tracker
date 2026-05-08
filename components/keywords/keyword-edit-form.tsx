"use client";

import { useActionState, useEffect } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { updateKeywordAction } from "@/lib/actions/keywords/update-keyword";
import { idleState } from "@/lib/actions/types";
import { KEYWORD_PRIORITIES } from "@/lib/validators/keyword";

interface KeywordEditFormProps {
  clientId: string;
  defaults: {
    priority: string | null;
    tags: string[];
    category: string | null;
    targetPosition: number | null;
    targetUrl: string | null;
    notes: string | null;
  };
  keywordId: string;
  onDone: () => void;
}

export function KeywordEditForm({
  clientId,
  keywordId,
  defaults,
  onDone,
}: KeywordEditFormProps) {
  const action = updateKeywordAction.bind(null, clientId, keywordId);
  const [state, formAction, isPending] = useActionState(action, idleState);

  useEffect(() => {
    if (state.status === "success") {
      onDone();
    }
  }, [state.status, onDone]);

  const fieldError = (
    field:
      | "priority"
      | "tags"
      | "category"
      | "targetPosition"
      | "targetUrl"
      | "notes"
  ) => (state.status === "error" ? state.fieldErrors?.[field]?.[0] : undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`priority-${keywordId}`}>Priority</Label>
          <NativeSelect
            className="w-full"
            defaultValue={defaults.priority ?? ""}
            id={`priority-${keywordId}`}
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

        <div className="flex flex-col gap-2">
          <Label htmlFor={`tags-${keywordId}`}>Tags</Label>
          <Input
            defaultValue={defaults.tags.join(", ")}
            id={`tags-${keywordId}`}
            name="tags"
            placeholder="commercial, brand"
            type="text"
          />
          {fieldError("tags") ? (
            <p className="text-destructive text-sm">{fieldError("tags")}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={`category-${keywordId}`}>Category</Label>
          <Input
            defaultValue={defaults.category ?? ""}
            id={`category-${keywordId}`}
            name="category"
            placeholder="commercial"
            type="text"
          />
          {fieldError("category") ? (
            <p className="text-destructive text-sm">{fieldError("category")}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor={`targetPosition-${keywordId}`}>Target position</Label>
          <Input
            defaultValue={defaults.targetPosition ?? ""}
            id={`targetPosition-${keywordId}`}
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

        <div className="flex flex-col gap-2 md:col-span-2">
          <Label htmlFor={`targetUrl-${keywordId}`}>Target URL</Label>
          <Input
            defaultValue={defaults.targetUrl ?? ""}
            id={`targetUrl-${keywordId}`}
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

      <div className="flex flex-col gap-2">
        <Label htmlFor={`notes-${keywordId}`}>Notes</Label>
        <Textarea
          defaultValue={defaults.notes ?? ""}
          id={`notes-${keywordId}`}
          name="notes"
          placeholder="SERP intent, comparison context, anything notable."
          rows={3}
        />
        {fieldError("notes") ? (
          <p className="text-destructive text-sm">{fieldError("notes")}</p>
        ) : null}
      </div>

      {state.status === "error" && state.formError ? (
        <Alert variant="destructive">
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>{state.formError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button onClick={onDone} type="button" variant="ghost">
          Cancel
        </Button>
        <Button disabled={isPending} type="submit">
          {isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
