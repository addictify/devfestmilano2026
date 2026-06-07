"use client";

import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";

type RevealProps = Omit<HTMLMotionProps<"div">, "children"> & {
  children?: React.ReactNode;
  /** Stagger delay in seconds. */
  delay?: number;
  /** Travel distance in px (vertical). */
  y?: number;
};

/** Fade + rise on scroll into view. Disabled under prefers-reduced-motion. */
export function MotionReveal({
  children,
  delay = 0,
  y = 18,
  className,
  ...props
}: RevealProps) {
  const reduce = useReducedMotion();

  if (reduce) {
    return (
      <div className={className} {...(props as React.HTMLAttributes<HTMLDivElement>)}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
