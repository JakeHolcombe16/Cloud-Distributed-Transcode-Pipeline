import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileQuestion, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg-primary)]">
      <FileQuestion className="h-16 w-16 text-[var(--text-tertiary)]" />
      <h1 className="mt-6 text-2xl font-semibold text-[var(--text-primary)]">
        Page not found
      </h1>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link href="/dashboard" className="mt-6">
        <Button>
          <Home className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </Link>
    </div>
  );
}
