"use client";
import { useEffect, useState } from "react";
import { WhoisCard } from "@/components/whois-card";
import type { WhoisSummary } from "@/lib/types";

export function WhoisPanel({ domain }: { domain: string }) {
  const [whois, setWhois] = useState<WhoisSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/get-whois?name=${encodeURIComponent(domain)}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("whois_error");
        const data = (await res.json()) as WhoisSummary;
        if (!cancelled) setWhois(data);
      } catch {
        if (!cancelled) setWhois({});
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [domain]);

  if (loading && !whois) return <WhoisCard whois={{}} />;
  return <WhoisCard whois={whois || {}} />;
}


