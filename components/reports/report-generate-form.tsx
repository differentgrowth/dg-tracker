"use client";

import { useActionState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateReportAction } from "@/lib/actions/reports/generate-report";
import { idleState } from "@/lib/actions/types";

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
  const [state, formAction, isPending] = useActionState(
    generateReportAction,
    idleState
  );

  const fieldError = (field: "periodStart" | "periodEnd") =>
    state.status === "error" ? state.fieldErrors?.[field]?.[0] : undefined;

  return (
    <form
      action={formAction}
      className="grid gap-4 md:grid-cols-[1fr_1fr_auto]"
      noValidate
    >
      <input name="clientId" type="hidden" value={clientId} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="periodStart">Period start</Label>
        <Input
          defaultValue={defaultPeriodStart}
          id="periodStart"
          name="periodStart"
          required
          type="date"
        />
        {fieldError("periodStart") ? (
          <p className="text-destructive text-sm">
            {fieldError("periodStart")}
          </p>
        ) : null}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="periodEnd">Period end</Label>
        <Input
          defaultValue={defaultPeriodEnd}
          id="periodEnd"
          name="periodEnd"
          required
          type="date"
        />
        {fieldError("periodEnd") ? (
          <p className="text-destructive text-sm">{fieldError("periodEnd")}</p>
        ) : null}
      </div>
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
    </form>
  );
}
