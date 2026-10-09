import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary";
type Size = "md" | "lg";

const VARIANT: Record<Variant, string> = {
  primary: "bg-ink text-surface border-ink",
  secondary: "bg-surface text-ink border-ink",
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
      className={`inline-flex items-center justify-center rounded-md border-[3px] font-semibold transition-transform active:scale-[0.96] focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT[variant]} ${SIZE[size]} ${className}`}
      {...props}
    />
  );
}