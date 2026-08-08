import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes } from "react";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background",
  {
    variants: {
      variant: {
        primary:
          "bg-primary-600 text-white hover:bg-primary-700 shadow-sm",
        secondary:
          "bg-white/10 border border-white/20 text-slate-700 hover:bg-white/20 hover:text-navy-900 shadow-sm backdrop-blur-xl",
        ghost:
          "hover:bg-gray-100 hover:text-gray-900",
        link:
          "underline-offset-4 hover:underline text-primary-600",
        danger:
          "bg-danger-600 text-white hover:bg-danger-700 shadow-sm"
      },
      size: {
        sm: "h-8 px-3 text-xs",
        base: "h-9 px-4 py-2",
        lg: "h-10 px-6 text-sm"
      }
    },
    defaultVariants: {
      variant: "primary",
      size: "base"
    }
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = ({ className, variant, size, ...props }: ButtonProps) => {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
};

export { Button, buttonVariants };