interface PageHeaderProps {
  actions?: React.ReactNode;
  description: string;
  eyebrow?: string;
  title: string;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b pb-6 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl">
        {eyebrow ? (
          <p className="mb-2 font-semibold text-primary text-xs uppercase tracking-[0.28em]">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-balance font-semibold text-3xl tracking-tight md:text-5xl">
          {title}
        </h1>
        <p className="mt-3 text-muted-foreground text-sm leading-6 md:text-base">
          {description}
        </p>
      </div>
      {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
    </div>
  );
}
