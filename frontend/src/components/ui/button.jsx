import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";
const variants = cva(
  "inline-flex items-center justify-center gap-2 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime-300",
  {
    variants: {
      variant: {
        default: "primary",
        secondary: "secondary",
        ghost: "text-button",
      },
    },
    defaultVariants: { variant: "default" },
  },
);
export function Button({ asChild = false, variant, className, ...props }) {
  const Component = asChild ? Slot : "button";
  return (
    <Component className={cn(variants({ variant }), className)} {...props} />
  );
}
