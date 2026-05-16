import type { ComponentProps } from "react";

import { Loading01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { cn } from "@/lib/utils";

type SpinnerProps = Omit<
  ComponentProps<typeof HugeiconsIcon>,
  "children" | "icon"
>;

function Spinner({ className, ...props }: SpinnerProps) {
  return (
    <HugeiconsIcon
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
      role="status"
      {...props}
      icon={Loading01Icon}
    />
  );
}

export { Spinner };
