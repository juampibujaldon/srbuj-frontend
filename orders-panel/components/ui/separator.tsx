import { cn } from "@/lib/utils";

export function Separator({ className, orientation = "horizontal" }: { className?: string; orientation?: "horizontal" | "vertical" }) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn(
        orientation === "horizontal" ? "my-2 h-px w-full bg-border" : "mx-2 h-full w-px bg-border",
        className
      )}
    />
  );
}
