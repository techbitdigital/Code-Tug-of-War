import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary";
type Size = "md" | "lg";

const VARIANT: Record<Variant, string> = {
  primary: "bg-gradient-to-b from-[#8B5CF6] to-accent text-white shadow-[0_5px_0_#5B21B6]",
  secondary: "bg-surface text-ink border-2 border-line shadow-key",
};

// 44px elsewhere, 56px on the match screen (per the brief).
const SIZE: Record<Size, string> = {
  md: "h-11 px-5 text-base",
  lg: "h-14 px-6 text-lg",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center rounded-2xl font-extrabold transition-[transform,box-shadow] active:translate-y-[4px] active:shadow-none focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT[variant]} ${SIZE[size]} ${className}`}
      {...props}
    />
  );
}
