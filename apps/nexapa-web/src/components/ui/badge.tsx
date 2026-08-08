import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-gray-200 bg-gray-100 text-gray-800",
        primary:
          "border-blue-200 bg-blue-100 text-blue-800",
        secondary:
          "border-cyan-200 bg-cyan-100 text-cyan-800",
        success:
          "border-green-200 bg-green-100 text-green-800",
        warning:
          "border-amber-200 bg-amber-100 text-amber-800",
        danger:
          "border-red-200 bg-red-100 text-red-800",
      },
      tone: {
        light: "bg-opacity-10 text-opacity-100 border-opacity-20",
        medium: "bg-opacity-20 text-opacity-100 border-opacity-30",
        strong: "bg-opacity-30 text-opacity-100 border-opacity-40",
      },
      dot: {
        true: "",
        false: "",
      },
    },
    compoundVariants: [
      {
        variant: "default",
        dot: true,
        className: "before:content-[''] before:h-1.5 before:w-1.5 before:rounded-full before:mr-1.5",
      },
      {
        variant: "primary",
        dot: true,
        className: "before:content-[''] before:h-1.5 before:w-1.5 before:rounded-full before:mr-1.5 before:bg-blue-600",
      },
      {
        variant: "secondary",
        dot: true,
        className: "before:content-[''] before:h-1.5 before:w-1.5 before:rounded-full before:mr-1.5 before:bg-cyan-600",
      },
      {
        variant: "success",
        dot: true,
        className: "before:content-[''] before:h-1.5 before:w-1.5 before:rounded-full before:mr-1.5 before:bg-green-600",
      },
      {
        variant: "warning",
        dot: true,
        className: "before:content-[''] before:h-1.5 before:w-1.5 before:rounded-full before:mr-1.5 before:bg-amber-500",
      },
      {
        variant: "danger",
        dot: true,
        className: "before:content-[''] before:h-1.5 before:w-1.5 before:rounded-full before:mr-1.5 before:bg-red-600",
      },
    ],
    defaultVariants: {
      variant: "default",
      tone: "medium",
      dot: false,
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, tone, dot, ...props }: BadgeProps) {
  return (
    <div
      className={cn(badgeVariants({ variant, tone, dot, className }))}
      {...props}
    />
  );
}

export { Badge, badgeVariants };