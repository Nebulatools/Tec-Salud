import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        success:
          "border-transparent bg-green-500 text-white hover:bg-green-600",
        outline: "text-foreground",
        zuli: "border-zuli-veronica/20 bg-zuli-veronica/10 text-zuli-veronica",
        zuliSecondary: "border-zuli-indigo/20 bg-zuli-indigo/10 text-zuli-indigo",
        zuliAccent: "border-zuli-cyan/20 bg-zuli-cyan/10 text-zuli-cyan-700 dark:text-zuli-cyan",
        zuliGradient: "border-0 bg-gradient-to-r from-zuli-veronica to-zuli-indigo text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
