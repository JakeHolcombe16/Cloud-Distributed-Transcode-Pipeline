import { forwardRef, type ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", size = "md", ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

    const variants = {
      primary:
        "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]",
      secondary:
        "border border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]",
      ghost:
        "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]",
      danger:
        "bg-[var(--status-failed)] text-white hover:bg-[#dc2626]",
    };

    const sizes = {
      sm: "h-8 rounded-md px-3 text-xs",
      md: "h-9 rounded-md px-4 text-sm",
      lg: "h-10 rounded-md px-6 text-sm",
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
