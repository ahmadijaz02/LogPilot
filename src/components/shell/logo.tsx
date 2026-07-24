import { cn } from "@/lib/utils";

export function Logo({
  className,
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-soft">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-5 w-5 text-primary-foreground"
          aria-hidden
        >
          <path
            d="M12 2.5 3 6.5v5c0 5 3.8 8.7 9 10 5.2-1.3 9-5 9-10v-5L12 2.5Z"
            fill="currentColor"
            fillOpacity="0.18"
          />
          <path
            d="M12 2.5 3 6.5v5c0 5 3.8 8.7 9 10 5.2-1.3 9-5 9-10v-5L12 2.5Z"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path
            d="m8.5 12 2.2 2.4L15.8 9"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {showWordmark && (
        <div className="flex flex-col leading-none">
          <span className="text-[0.95rem] font-semibold tracking-tight">
            LogPilot
          </span>
          <span className="text-[0.65rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            HOS Compliance
          </span>
        </div>
      )}
    </div>
  );
}
