import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(139,128,255,0.55)] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: [
          "bg-gradient-to-r from-[#6d62f3] to-[#5548d9] text-white border border-[rgba(139,128,255,0.28)]",
          "hover:from-[#7c72f5] hover:to-[#6358e8]",
          "shadow-[0_0_18px_rgba(109,98,243,0.22)]",
          "hover:shadow-[0_0_24px_rgba(109,98,243,0.34)]",
        ].join(" "),
        destructive:
          "bg-[rgba(244,63,94,0.14)] text-[#f43f5e] border border-[rgba(244,63,94,0.28)] hover:bg-[rgba(244,63,94,0.22)]",
        outline:
          "border border-[rgba(109,98,243,0.22)] bg-[rgba(109,98,243,0.06)] hover:bg-[rgba(109,98,243,0.12)] text-[var(--text-primary)]",
        secondary:
          "bg-[rgba(237,238,246,0.06)] text-[var(--text-primary)] border border-[rgba(237,238,246,0.10)] hover:bg-[rgba(237,238,246,0.10)]",
        ghost:
          "hover:bg-[rgba(109,98,243,0.08)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
        link:
          "text-[var(--accent-light)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm:      "h-8 px-3 text-xs",
        lg:      "h-11 px-8 text-base",
        icon:    "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
