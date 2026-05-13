"use client";

import type { CreateUserActionResult } from "@/lib/actions/users/create-user";

import { useActionState, useEffect, useRef } from "react";

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
import { createUserAction } from "@/lib/actions/users/create-user";
import { USER_ROLES } from "@/lib/validators/user";

const initialState = {
  status: "idle",
} as const satisfies CreateUserActionResult;

function submitLabel(isPending: boolean) {
  return isPending ? "Creating…" : "Create user";
}

export function UserCreateForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(
    createUserAction,
    initialState
  );

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state.status]);

  const fieldError = (field: "email" | "name" | "password" | "role") =>
    state.status === "error" ? state.fieldErrors?.[field]?.[0] : undefined;

  return (
    <form
      action={formAction}
      className="flex flex-col gap-6"
      noValidate
      ref={formRef}
    >
      <div className="grid gap-6 md:grid-cols-2">
        <FieldRow
          autoComplete="name"
          autoFocus
          error={fieldError("name")}
          label="Name"
          name="name"
          placeholder="Jane Doe"
          required
        />
        <FieldRow
          autoComplete="email"
          error={fieldError("email")}
          label="Email"
          name="email"
          placeholder="jane@differentgrowth.com"
          required
          type="email"
        />
        <FieldRow
          autoComplete="new-password"
          error={fieldError("password")}
          hint="Minimum 12 characters."
          label="Temporary password"
          name="password"
          required
          type="password"
        />
        <div className="flex flex-col gap-2">
          <Label htmlFor="role">Role</Label>
          <Select
            defaultValue="member"
            id="role"
            items={USER_ROLES.map((value) => ({ label: value, value }))}
            name="role"
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {USER_ROLES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          {fieldError("role") ? (
            <p className="text-destructive text-sm">{fieldError("role")}</p>
          ) : null}
        </div>
      </div>

      {state.status === "error" && state.formError ? (
        <Alert variant="destructive">
          <AlertTitle>User was not created</AlertTitle>
          <AlertDescription>{state.formError}</AlertDescription>
        </Alert>
      ) : null}

      {state.status === "success" ? (
        <Alert>
          <AlertTitle>User created</AlertTitle>
          <AlertDescription>
            {state.email} now has {state.role} access.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex justify-end">
        <Button disabled={isPending} type="submit">
          {submitLabel(isPending)}
        </Button>
      </div>
    </form>
  );
}

interface FieldRowProps {
  autoComplete?: string;
  autoFocus?: boolean;
  error?: string;
  hint?: string;
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  type?: "email" | "password" | "text";
}

function FieldRow({
  autoComplete,
  autoFocus,
  error,
  hint,
  label,
  name,
  placeholder,
  required,
  type = "text",
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
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        id={name}
        name={name}
        placeholder={placeholder}
        required={required}
        type={type}
      />
      {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </div>
  );
}
