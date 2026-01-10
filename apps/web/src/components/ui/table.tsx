import { type HTMLAttributes, type TdHTMLAttributes, type ThHTMLAttributes } from "react";

export function Table({ className = "", ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-auto">
      <table className={`w-full caption-bottom text-sm ${className}`} {...props} />
    </div>
  );
}

export function TableHeader({ className = "", ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={`border-b border-[var(--border-default)] ${className}`} {...props} />;
}

export function TableBody({ className = "", ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={`[&_tr:last-child]:border-0 ${className}`} {...props} />;
}

export function TableRow({ className = "", ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={`border-b border-[var(--border-default)] transition-colors hover:bg-[var(--bg-tertiary)] ${className}`}
      {...props}
    />
  );
}

export function TableHead({ className = "", ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={`h-10 px-4 text-left align-middle text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)] ${className}`}
      {...props}
    />
  );
}

export function TableCell({ className = "", ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={`px-4 py-3 align-middle text-[var(--text-primary)] ${className}`}
      {...props}
    />
  );
}
