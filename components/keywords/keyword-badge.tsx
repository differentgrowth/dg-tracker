import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface KeywordBadgeProps {
  className?: string;
  term: string;
}

export function KeywordBadge({ className, term }: KeywordBadgeProps) {
  return (
    <Badge
      className={cn("max-w-full truncate", className)}
      title={term}
      variant="outline"
    >
      {term}
    </Badge>
  );
}
