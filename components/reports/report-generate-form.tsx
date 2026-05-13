"use client";

import { useActionState, useState } from "react";

import { RiCalendarLine } from "@remixicon/react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { generateReportAction } from "@/lib/actions/reports/generate-report";
import { idleState } from "@/lib/actions/types";
import { cn } from "@/lib/utils";

interface ReportGenerateFormProps {
  clientId: string;
  defaultPeriodEnd: string;
  defaultPeriodStart: string;
}

export function ReportGenerateForm({
  clientId,
  defaultPeriodEnd,
  defaultPeriodStart,
}: ReportGenerateFormProps) {
  const [periodStart, setPeriodStart] = useState(() =>
    parseDateInput(defaultPeriodStart)
  );
  const [periodEnd, setPeriodEnd] = useState(() =>
    parseDateInput(defaultPeriodEnd)
  );
  const [state, formAction, isPending] = useActionState(
    generateReportAction,
    idleState
  );

  const fieldError = (field: "periodStart" | "periodEnd") =>
    state.status === "error" ? state.fieldErrors?.[field]?.[0] : undefined;

  return (
    <form action={formAction} noValidate>
      <FieldGroup className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
        <input name="clientId" type="hidden" value={clientId} />
        <ReportDateField
          error={fieldError("periodStart")}
          id="periodStart"
          label="Period start"
          name="periodStart"
          onChange={setPeriodStart}
          value={periodStart}
        />
        <ReportDateField
          error={fieldError("periodEnd")}
          id="periodEnd"
          label="Period end"
          name="periodEnd"
          onChange={setPeriodEnd}
          value={periodEnd}
        />
        <div className="flex items-end">
          <Button className="w-full" disabled={isPending} type="submit">
            {isPending ? "Generating…" : "Generate report"}
          </Button>
        </div>
        {state.status === "error" && state.formError ? (
          <Alert className="md:col-span-3" variant="destructive">
            <AlertTitle>Report not generated</AlertTitle>
            <AlertDescription>{state.formError}</AlertDescription>
          </Alert>
        ) : null}
      </FieldGroup>
    </form>
  );
}

interface ReportDateFieldProps {
  error?: string;
  id: string;
  label: string;
  name: "periodStart" | "periodEnd";
  onChange: (date: Date | undefined) => void;
  value: Date | undefined;
}

function ReportDateField({
  error,
  id,
  label,
  name,
  onChange,
  value,
}: ReportDateFieldProps) {
  const [open, setOpen] = useState(false);
  const errorId = error ? `${id}-error` : undefined;
  const displayValue = value ? formatDisplayDate(value) : "Pick a date";

  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <input name={name} type="hidden" value={formatDateInput(value)} />
      <Popover onOpenChange={setOpen} open={open}>
        <PopoverTrigger
          render={
            <Button
              aria-describedby={errorId}
              aria-invalid={Boolean(error)}
              aria-label={`${label}: ${displayValue}`}
              className={cn(
                "w-full justify-start text-left font-normal",
                !value && "text-muted-foreground"
              )}
              id={id}
              type="button"
              variant="outline"
            />
          }
        >
          <RiCalendarLine data-icon="inline-start" />
          {displayValue}
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            captionLayout="dropdown"
            defaultMonth={value}
            mode="single"
            onSelect={(date) => {
              onChange(date);
              if (date) {
                setOpen(false);
              }
            }}
            selected={value}
          />
        </PopoverContent>
      </Popover>
      <FieldError id={errorId}>{error}</FieldError>
    </Field>
  );
}

const displayDateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
});
const dateInputPattern = /^(\d{4})-(\d{2})-(\d{2})$/;

function formatDisplayDate(date: Date) {
  return displayDateFormatter.format(date);
}

function parseDateInput(value: string) {
  const match = dateInputPattern.exec(value);
  if (!match) {
    return;
  }

  const [, yearValue, monthValue, dayValue] = match;
  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return;
  }

  return date;
}

function formatDateInput(date: Date | undefined) {
  if (!date) {
    return "";
  }

  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
