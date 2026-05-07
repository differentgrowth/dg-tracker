"use client";

import { useActionState, useEffect, useRef } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createDomainAction } from "@/lib/actions/domains/create-domain";
import { updateDomainAction } from "@/lib/actions/domains/update-domain";
import { idleState } from "@/lib/actions/types";

interface DomainFormDefaults {
  notes?: string | null;
  url?: string | null;
}

type DomainFormProps =
  | {
      mode: "create";
      clientId: string;
      defaults?: DomainFormDefaults;
    }
  | {
      mode: "edit";
      clientId: string;
      domainId: string;
      defaults: DomainFormDefaults;
      onDone?: () => void;
    };

function submitLabel(
  isPending: boolean,
  isCreate: boolean,
  createLabel: string
) {
  if (isPending) {
    return "Saving…";
  }
  return isCreate ? createLabel : "Save changes";
}

export function DomainForm(props: DomainFormProps) {
  const action =
    props.mode === "create"
      ? createDomainAction.bind(null, props.clientId)
      : updateDomainAction.bind(null, props.clientId, props.domainId);

  const [state, formAction, isPending] = useActionState(action, idleState);
  const formRef = useRef<HTMLFormElement>(null);
  const onDone = props.mode === "edit" ? props.onDone : undefined;

  useEffect(() => {
    if (state.status !== "success") {
      return;
    }
    if (props.mode === "create") {
      formRef.current?.reset();
      return;
    }
    onDone?.();
  }, [state.status, props.mode, onDone]);

  const fieldError = (field: keyof DomainFormDefaults) =>
    state.status === "error" ? state.fieldErrors?.[field]?.[0] : undefined;

  const defaults = props.defaults ?? {};

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4"
      noValidate
      ref={formRef}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${props.mode}-url`}>
          URL
          <span aria-hidden="true" className="ml-1 text-destructive">
            *
          </span>
        </Label>
        <Input
          autoFocus={props.mode === "edit"}
          defaultValue={defaults.url ?? ""}
          id={`${props.mode}-url`}
          name="url"
          placeholder="https://acme.com"
          required
          type="text"
        />
        {fieldError("url") ? (
          <p className="text-destructive text-sm">{fieldError("url")}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${props.mode}-notes`}>Notes</Label>
        <Textarea
          defaultValue={defaults.notes ?? ""}
          id={`${props.mode}-notes`}
          name="notes"
          placeholder="Subdomain context, redirects, anything worth remembering."
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
        {props.mode === "edit" ? (
          <Button onClick={onDone} type="button" variant="ghost">
            Cancel
          </Button>
        ) : null}
        <Button disabled={isPending} type="submit">
          {submitLabel(isPending, props.mode === "create", "Add domain")}
        </Button>
      </div>
    </form>
  );
}
