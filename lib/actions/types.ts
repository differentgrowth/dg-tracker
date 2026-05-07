export type ActionResult<TFields extends string = string> =
  | { status: "idle" }
  | { status: "success" }
  | {
      status: "error";
      formError?: string;
      fieldErrors?: Partial<Record<TFields, string[]>>;
    };

export const idleState = { status: "idle" } as const satisfies ActionResult;
