import { cn } from "@/lib/utils";

interface SectionDividerProps {
  className?: string;
  corners?: boolean;
}

export function SectionDivider({
  className,
  corners = true,
}: SectionDividerProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative h-6 w-full border-y bg-diagonal-lines",
        className
      )}
    >
      {corners ? (
        <>
          <span className="-translate-x-1/2 -translate-y-1/2 absolute top-0 left-0 size-1.5 bg-foreground" />
          <span className="-translate-y-1/2 absolute top-0 right-0 size-1.5 translate-x-1/2 bg-foreground" />
          <span className="-translate-x-1/2 absolute bottom-0 left-0 size-1.5 translate-y-1/2 bg-foreground" />
          <span className="absolute right-0 bottom-0 size-1.5 translate-x-1/2 translate-y-1/2 bg-foreground" />
        </>
      ) : null}
    </div>
  );
}
