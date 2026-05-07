import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatCardProps {
  accent?: "primary" | "secondary" | "muted";
  detail: string;
  label: string;
  value: string | number;
}

export function StatCard({
  label,
  value,
  detail,
  accent = "muted",
}: StatCardProps) {
  const accentClass = {
    muted: "bg-muted",
    primary: "bg-primary/15",
    secondary: "bg-secondary/25",
  }[accent];

  return (
    <Card className="relative overflow-hidden bg-card/95">
      <div className={`absolute top-0 right-0 h-full w-2 ${accentClass}`} />
      <CardHeader className="pb-2">
        <CardTitle className="text-muted-foreground text-xs">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="font-semibold text-4xl tracking-tight">{value}</p>
        <p className="mt-2 text-muted-foreground text-sm">{detail}</p>
      </CardContent>
    </Card>
  );
}
