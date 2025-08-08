import Link from "next/link";
import type { Suggestion } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function SuggestionsGrid({ suggestions }: { suggestions: Suggestion[] }) {
  if (!suggestions || suggestions.length === 0) {
    return <div className="text-sm text-muted-foreground">No good alternatives found. Try a different keyword.</div>;
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {suggestions.slice(0, 12).map((s) => (
        <div key={s.domain} className="flex items-center justify-between border rounded-md p-3">
          <div className="flex items-center gap-2">
            <span>{s.domain}</span>
            {s.available ? (
              <Badge variant="secondary">Available</Badge>
            ) : (
              <Badge variant="outline">Taken</Badge>
            )}
          </div>
          <Link href={`/results/${encodeURIComponent(s.domain)}`}>
            <Button variant="ghost">Check</Button>
          </Link>
        </div>
      ))}
    </div>
  );
}


