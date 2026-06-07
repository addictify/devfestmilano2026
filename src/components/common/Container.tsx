import { cn } from "@/lib/utils";

export function Container({
  className,
  as: Comp = "div",
  ...props
}: React.HTMLAttributes<HTMLElement> & { as?: React.ElementType }) {
  return (
    <Comp
      className={cn("mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-10", className)}
      {...props}
    />
  );
}
