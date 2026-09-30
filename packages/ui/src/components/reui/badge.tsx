import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "cn";

const badgeVariants = cva(
  [
    "relative inline-flex w-fit shrink-0 items-center justify-center whitespace-nowrap border border-transparent font-medium outline-none transition-shadow",
    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
    "[&_svg:not([class*=size-])]:size-3 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  ],
  {
    defaultVariants: {
      radius: "default",
      size: "default",
      variant: "default",
    },
    variants: {
      /** `default`: active style radius. `full`: pill radius. */
      radius: {
        default: "rounded-sm",
        full: "rounded-full",
      },
      size: {
        default: "h-5 min-w-5 gap-1 px-1.25 py-0.5 text-xs",
        lg: "h-5.5 min-w-5.5 gap-1 px-1.5 py-0.5 text-xs",
        sm: "h-4.5 min-w-4.5 gap-1 px-1 py-0.25 text-[0.625rem] leading-none",
        xl: "h-6 min-w-6 gap-1.5 px-2 py-0.75 text-sm",
        xs: "h-4 min-w-4 gap-1 px-1 py-0.25 text-[0.6rem] leading-none",
      },
      variant: {
        default: "bg-primary text-primary-foreground",
        destructive: "bg-destructive text-white",
        "destructive-light":
          "border-destructive/15 bg-destructive/10 text-destructive-foreground dark:border-destructive/25 dark:bg-destructive/15 dark:text-destructive",
        "destructive-outline":
          "border-border bg-background text-destructive-foreground dark:bg-input/30",
        focus: "bg-focus text-focus-foreground",
        "focus-light":
          "border-focus/15 bg-focus/10 text-focus-foreground dark:border-focus/25 dark:bg-focus/15 dark:text-focus",
        "focus-outline":
          "border-border bg-background text-focus-foreground dark:bg-input/30",
        info: "bg-info text-white",
        "info-light":
          "border-info/15 bg-info/10 text-info-foreground dark:border-info/25 dark:bg-info/15 dark:text-info",
        "info-outline":
          "border-border bg-background text-info-foreground dark:bg-input/30",
        invert: "bg-invert text-invert-foreground",
        "invert-light":
          "border-invert/15 bg-invert/10 text-foreground dark:border-invert/45 dark:bg-invert/35 dark:text-invert-foreground",
        "invert-outline":
          "border-border bg-background text-invert-foreground dark:bg-input/30",
        outline: "border-border bg-transparent dark:bg-input/32",
        "primary-light":
          "border-primary/10 bg-primary/10 text-primary dark:border-primary/25 dark:bg-primary/15 dark:text-primary",
        "primary-outline":
          "border-border bg-background text-primary dark:bg-input/30",
        secondary: "bg-secondary text-secondary-foreground",
        success: "bg-success text-white",
        "success-light":
          "border-success/15 bg-success/10 text-success-foreground dark:border-success/25 dark:bg-success/15 dark:text-success",
        "success-outline":
          "border-border bg-background text-success-foreground dark:bg-input/30",
        warning: "bg-warning text-white",
        "warning-light":
          "border-warning/15 bg-warning/10 text-warning-foreground dark:border-warning/25 dark:bg-warning/15 dark:text-warning",
        "warning-outline":
          "border-border bg-background text-warning-foreground dark:bg-input/30",
      },
    },
  }
);

interface BadgeProps extends useRender.ComponentProps<"span"> {
  radius?: VariantProps<typeof badgeVariants>["radius"];
  size?: VariantProps<typeof badgeVariants>["size"];
  variant?: VariantProps<typeof badgeVariants>["variant"];
}

function Badge({
  className,
  variant,
  size,
  radius,
  render,
  ...props
}: BadgeProps) {
  const defaultProps = {
    className: cn(badgeVariants({ className, radius, size, variant })),
    "data-slot": "badge",
  };

  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(defaultProps, props),
    render,
  });
}

export { Badge, type BadgeProps, badgeVariants };
