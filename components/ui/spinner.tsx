import type { ComponentProps } from "react";

import { RiLoaderLine } from "@remixicon/react";

import { cn } from "@/lib/utils";

type SpinnerProps = Omit<ComponentProps<typeof RiLoaderLine>, "children">;

function Spinner({ className, ...props }: SpinnerProps) {
  return (
    <RiLoaderLine
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
      role="status"
      {...props}
    />
  );
}

export { Spinner };
