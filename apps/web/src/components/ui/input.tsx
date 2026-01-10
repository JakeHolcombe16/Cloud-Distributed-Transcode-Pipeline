import { forwardRef, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", error, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          ref={ref}
          className={`flex h-9 w-full rounded-md border bg-[var(--bg-primary)] px-3 py-1 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 ${
            error
              ? "border-[var(--status-failed)] focus:ring-[var(--status-failed)]"
              : "border-[var(--border-default)]"
          } ${className}`}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs text-[var(--status-failed)]">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
