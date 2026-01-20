import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        // Priority variants
        priorityHigh:
          "bg-priority-high-bg border-priority-high-border text-priority-high-foreground",
        priorityMedium:
          "bg-priority-medium-bg border-priority-medium-border text-priority-medium-foreground",
        priorityLow:
          "bg-priority-low-bg border-priority-low-border text-priority-low-foreground",
        priorityUnscored:
          "bg-priority-unscored-bg border-priority-unscored-border text-priority-unscored-foreground",
        // Customer tier variants
        tierC1:
          "bg-tier-c1-bg border-tier-c1-border text-tier-c1-foreground",
        tierC2:
          "bg-tier-c2-bg border-tier-c2-border text-tier-c2-foreground",
        tierC3:
          "bg-tier-c3-bg border-tier-c3-border text-tier-c3-foreground",
        tierC4:
          "bg-tier-c4-bg border-tier-c4-border text-tier-c4-foreground",
        tierC5:
          "bg-tier-c5-bg border-tier-c5-border text-tier-c5-foreground",
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
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span"

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
