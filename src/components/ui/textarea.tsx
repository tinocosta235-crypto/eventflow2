import * as React from "react"
import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-[80px] w-full resize-none rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] shadow-sm transition-colors",
        "focus-visible:outline-none focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[rgba(109,98,243,0.15)]",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[var(--depth-3)]",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
