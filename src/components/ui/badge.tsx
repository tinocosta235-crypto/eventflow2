import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors",
  {
    variants: {
      variant: {
        default:     "bg-indigo-50 text-indigo-700 border border-indigo-100",
        secondary:   "bg-gray-100 text-gray-600 border border-gray-200",
        destructive: "bg-red-50 text-red-600 border border-red-100",
        outline:     "border border-[var(--border)] text-[var(--text-secondary)] bg-transparent",
        success:     "bg-green-50 text-green-700 border border-green-100",
        warning:     "bg-amber-50 text-amber-700 border border-amber-100",
        info:        "bg-cyan-50 text-cyan-700 border border-cyan-100",
        ai:          "bg-violet-50 text-violet-700 border border-violet-100",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
