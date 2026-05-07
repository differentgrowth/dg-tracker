"use client";

import { useActionState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { createClientAction } from "@/lib/actions/clients/create-client";
import { updateClientAction } from "@/lib/actions/clients/update-client";
import { idleState } from "@/lib/actions/types";
import { CLIENT_STATUSES } from "@/lib/validators/client";

interface ClientFormDefaults {
  assignedTo?: string | null;
  gscProperty?: string | null;
  name?: string | null;
  notes?: string | null;
  primaryDomain?: string | null;
  status?: string | null;
}

type ClientFormProps =
  | {
      mode: "create";
      defaults?: ClientFormDefaults;
    }
  | {
      mode: "edit";
      clientId: string;
      defaults: ClientFormDefaults;
    };

function submitLabel(isPending: boolean, isCreate: boolean) {
  if (isPending) {
    return "Saving…";
  }
  return isCreate ? "Create client" : "Save changes";
}

export function ClientForm(props: ClientFormProps) {
  const action =
    props.mode === "create"
      ? createClientAction
      : updateClientAction.bind(null, props.clientId);

  const [state, formAction, isPending] = useActionState(action, idleState);

  const fieldError = (field: keyof ClientFormDefaults) =>
    state.status === "error" ? state.fieldErrors?.[field]?.[0] : undefined;

  const defaults = props.defaults ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      <div className="grid gap-6 md:grid-cols-2">
        <FieldRow
          autoFocus
          defaultValue={defaults.name ?? ""}
          error={fieldError("name")}
          label="Name"
          name="name"
          placeholder="Acme Co."
          required
        />
        <FieldRow
          defaultValue={defaults.primaryDomain ?? ""}
          error={fieldError("primaryDomain")}
          hint="Free text — e.g. acme.com or https://acme.com."
          label="Primary domain"
          name="primaryDomain"
          placeholder="acme.com"
        />
        <FieldRow
          defaultValue={defaults.gscProperty ?? ""}
          error={fieldError("gscProperty")}
          hint="Format used by Google Search Console, e.g. sc-domain:acme.com."
          label="GSC property"
          name="gscProperty"
          placeholder="sc-domain:acme.com"
        />
        <FieldRow
          defaultValue={defaults.assignedTo ?? ""}
          error={fieldError("assignedTo")}
          hint="Free text for now (team email or name)."
          label="Assignee"
          name="assignedTo"
          placeholder="alex@differentgrowth.com"
        />
        <div className="flex flex-col gap-2">
          <Label htmlFor="status">Status</Label>
          <NativeSelect
            defaultValue={defaults.status ?? "active"}
            id="status"
            name="status"
          >
            {CLIENT_STATUSES.map((value) => (
              <NativeSelectOption key={value} value={value}>
                {value}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {fieldError("status") ? (
            <p className="text-destructive text-sm">{fieldError("status")}</p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          defaultValue={defaults.notes ?? ""}
          id="notes"
          name="notes"
          placeholder="Internal context, account history, GSC quirks…"
          rows={4}
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

      {state.status === "success" && props.mode === "edit" ? (
        <Alert>
          <AlertTitle>Saved</AlertTitle>
          <AlertDescription>
            Client details updated. The dashboard reflects the new values.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button disabled={isPending} type="submit">
          {submitLabel(isPending, props.mode === "create")}
        </Button>
      </div>
    </form>
  );
}

interface FieldRowProps {
  autoFocus?: boolean;
  defaultValue?: string;
  error?: string;
  hint?: string;
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
}

function FieldRow({
  autoFocus,
  defaultValue,
  error,
  hint,
  label,
  name,
  placeholder,
  required,
}: FieldRowProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={name}>
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-1 text-destructive">
            *
          </span>
        ) : null}
      </Label>
      <Input
        autoFocus={autoFocus}
        defaultValue={defaultValue}
        id={name}
        name={name}
        placeholder={placeholder}
        required={required}
        type="text"
      />
      {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </div>
  );
}
