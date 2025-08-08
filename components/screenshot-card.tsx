"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ScreenshotCard({ domain, url }: { domain: string; url?: string }) {
  const [loaded, setLoaded] = useState(false);
  const src = url || `/api/get-screenshot?name=${encodeURIComponent(domain)}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Homepage</CardTitle>
      </CardHeader>
      <CardContent>
        <a href={`https://${domain}`} target="_blank" rel="noopener noreferrer" className="block">
          <div className="relative w-full overflow-hidden rounded-md" style={{ aspectRatio: "16/9" }}>
            {!loaded && (
              <div className="absolute inset-0">
                <Skeleton className="h-full w-full" />
              </div>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={`Homepage screenshot of ${domain}`}
              className={`h-full w-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
              loading="lazy"
              onLoad={() => setLoaded(true)}
            />
          </div>
        </a>
      </CardContent>
    </Card>
  );
}


