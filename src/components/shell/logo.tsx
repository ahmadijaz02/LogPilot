import { cn } from "@/lib/utils";

/**
 * Typographic wordmark — no icon. The name carries the brand, set in the
 * display serif with a hairline brand rule beneath it.
 */
export function Logo({
  className,
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  if (!showWordmark) {
    return (
      <span
        className={cn(
          "font-display text-lg leading-none tracking-[0.06em]",
          className,
        )}
      >
        LP
      </span>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1 leading-none", className)}>
      <span className="font-display text-[1.0625rem] tracking-[0.02em]">
        Log<span className="text-foil">Pilot</span>
      </span>
      <span className="flex items-center gap-2">
        <span className="h-px w-4 bg-primary/60" />
        <span className="text-[0.5625rem] font-medium uppercase tracking-[0.28em] text-muted-foreground">
          HOS Compliance
        </span>
      </span>
    </div>
  );
}
