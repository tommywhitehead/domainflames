"use client";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { sanitizeDomainInput, isLikelyValidDomain } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function SearchBar({ initialValue = "" }: { initialValue?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;
    const sanitized = sanitizeDomainInput(value);
    if (!isLikelyValidDomain(sanitized)) {
      setError("Please enter a valid domain (e.g., example.com)");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    router.push(`/results/${encodeURIComponent(sanitized)}`);
  }

  return (
    <div>
      <form className="flex gap-2" onSubmit={onSubmit} role="search" aria-label="Domain search" aria-busy={isSubmitting}>
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search domain (e.g., mycoolstartup.io)"
          aria-label="Domain name"
          autoFocus
          disabled={isSubmitting}
        />
        <Button type="submit" disabled={isSubmitting} aria-disabled={isSubmitting}>
          {isSubmitting ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" aria-hidden />
              Searching…
            </span>
          ) : (
            "Search"
          )}
        </Button>
      </form>
      {error && (
        <div className="mt-2" aria-live="polite">
          <Alert>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
}


