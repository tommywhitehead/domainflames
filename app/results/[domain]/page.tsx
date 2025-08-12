import Link from "next/link";
import { Suspense } from "react";
import { extractTld } from "@/lib/tld";
import type { RegistrarPrice, Suggestion, DomainStatus } from "@/lib/types";
import { getDomainStatus, getAlternatives, getRegistrarPrices, getScreenshotUrl } from "@/lib/fetchers";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { RegistrarTable } from "@/components/registrar-table";
import { WhoisPanel } from "@/components/whois-panel";
import { ScreenshotCard } from "@/components/screenshot-card";
import { SuggestionsGrid } from "@/components/suggestions-grid";
import SearchBar from "@/components/search-bar";

type Params = { params: Promise<{ domain: string }> };

export default async function ResultsPage({ params }: Params) {
  const { domain } = await params;
  const decoded = decodeURIComponent(domain);
  const tld = extractTld(decoded);
  const errors: string[] = [];
  let status: DomainStatus = { domain: decoded, available: false, statusRaw: "unknown", tld };
  try {
    status = await getDomainStatus(decoded);
  } catch {
    errors.push("Failed to check domain status.");
  }

  let alternatives: Suggestion[] = [];
  try {
    alternatives = await getAlternatives(decoded);
  } catch {
    errors.push("Failed to load suggestions.");
  }

  let prices: RegistrarPrice[] = [];
  try {
    prices = await getRegistrarPrices(tld, decoded);
  } catch {
    errors.push("Failed to load registrar prices.");
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <SearchBar initialValue={decoded} />
      </div>
      {errors.length > 0 && (
        <Alert className="mb-4" role="status">
          <AlertTitle>Some data failed to load</AlertTitle>
          <AlertDescription>We had trouble fetching: {errors.join(" ")} Please try again.</AlertDescription>
        </Alert>
      )}

      <header className="flex items-center justify-between mb-6" aria-live="polite">
        <h1 className="text-2xl font-semibold">{decoded}</h1>
        {status.available ? (
          <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white border-transparent">
            ✓ Available
          </Badge>
        ) : (
          <Badge className="bg-red-600 hover:bg-red-600 text-white border-transparent">
            ✕ Taken
          </Badge>
        )}
      </header>

      {status.available ? (
        <AvailableSection domain={decoded} prices={prices} />
      ) : (
        <section className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Suspense fallback={<WhoisSkeleton />}>
              <WhoisPanel domain={decoded} />
            </Suspense>
            <Suspense fallback={<ScreenshotSkeleton />}>
              <ScreenshotSection domain={decoded} />
            </Suspense>
          </div>
          <div>
            <Link href={`https://${decoded}`} target="_blank" className="underline" rel="noopener noreferrer">
              Visit live site →
            </Link>
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-xl font-semibold mb-3">You might also like…</h2>
        <Suspense fallback={<div className="grid grid-cols-2 gap-3">{Array.from({ length: 6 }).map((_, i) => (<Skeleton key={i} className="h-10 w-full" />))}</div>}>
          <SuggestionsGrid suggestions={(alternatives || []).filter(a => a.available).slice(0, 12)} />
        </Suspense>
      </section>
    </div>
  );
}

function AvailableSection({ domain, prices }: { domain: string; prices: RegistrarPrice[] }) {
  const hasPrice = prices && prices.length > 0 && prices[0].priceUsd > 0;
  const rows: RegistrarPrice[] = prices && prices.length > 0 ? prices : [
    { registrar: "GoDaddy", priceUsd: 0, buyUrl: `https://www.godaddy.com/domainsearch/find?checkAvail=1&tmskey=&domainToCheck=${encodeURIComponent(domain)}` },
  ];
  return (
    <section>
      <Card>
        <CardHeader>
          <CardTitle>{domain} is available</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">Prices are first‑year registration estimates. Taxes/fees may vary.</p>
          {!hasPrice && (
            <Alert className="mb-3">
              <AlertTitle>Live price unavailable</AlertTitle>
              <AlertDescription>
                Connect a pricing API (e.g., TLD‑List or GoDaddy) to display the exact number. Use the button below to check the live price on GoDaddy.
              </AlertDescription>
            </Alert>
          )}
          <RegistrarTable prices={rows} showCta />
        </CardContent>
      </Card>
    </section>
  );
}

async function ScreenshotSection({ domain }: { domain: string }) {
  try {
    const url = await getScreenshotUrl(domain);
    return <ScreenshotCard domain={domain} url={url} />;
  } catch {
    return <ScreenshotCard domain={domain} url={undefined} />;
  }
}

function WhoisSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>WHOIS</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ScreenshotSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Homepage</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative w-full overflow-hidden rounded-md bg-muted" style={{ aspectRatio: "16/9" }}>
          <Skeleton className="h-full w-full" />
        </div>
      </CardContent>
    </Card>
  );
}


