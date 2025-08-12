import { extractTld } from "@/lib/tld";
import { getEnv, isDemoMode } from "@/lib/utils";
import type {
  DomainStatus,
  RegistrarPrice,
  Suggestion,
  WhoisSummary,
} from "@/lib/types";

const FIVE_MINUTES = 300;
const DEFAULT_TIMEOUT_MS = 8000;

function nextFetchInit(): RequestInit & { next: { revalidate: number } } {
  return { next: { revalidate: FIVE_MINUTES } } as { next: { revalidate: number } };
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit & { next?: { revalidate?: number } } = {},
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal } as RequestInit);
    return res;
  } finally {
    clearTimeout(id);
  }
}

async function rdapLookup(domain: string): Promise<{ exists: boolean; statusRaw: string }> {
  const url = `https://rdap.org/domain/${encodeURIComponent(domain)}`;
  try {
    const res = await fetchWithTimeout(url, nextFetchInit(), 8000);
    if (res.status === 404) return { exists: false, statusRaw: "not found" };
    if (!res.ok) return { exists: false, statusRaw: `rdap_error_${res.status}` };
    const data = (await res.json()) as { status?: string[] };
    const statusRaw = (data?.status || []).join(", ") || "active";
    return { exists: true, statusRaw };
  } catch {
    return { exists: false, statusRaw: "rdap_timeout" };
  }
}

function toKeyword(domain: string): string {
  const lower = domain.toLowerCase();
  const withoutProto = lower.replace(/^https?:\/\//, "");
  const host = withoutProto.split("/")[0];
  const parts = host.split(".").filter(Boolean);
  if (parts.length <= 1) return host.replace(/[^a-z0-9-]/g, "");
  return parts.slice(0, -1).join("-").replace(/[^a-z0-9-]/g, "");
}

const DEMO_FIXTURES = {
  "example.com": {
    status: { domain: "example.com", available: false, statusRaw: "active", tld: "com" } as DomainStatus,
    prices: [
      { registrar: "Namecheap", priceUsd: 9.58, buyUrl: "https://www.namecheap.com/domains/registration/results/?domain=example.com" },
      { registrar: "GoDaddy", priceUsd: 12.99, buyUrl: "https://www.godaddy.com/domainsearch/find?checkAvail=1&tmskey=&domainToCheck=example.com" },
      { registrar: "Google Domains", priceUsd: 12.0, buyUrl: "https://domains.google.com/registrar/search?searchTerm=example.com" },
    ] as RegistrarPrice[],
    whois: {
      registrar: "IANA",
      createdAt: "1995-08-14T04:00:00Z",
      expiresAt: "2025-08-13T04:00:00Z",
      registrantCountry: "US",
      status: ["active"],
    } as WhoisSummary,
    suggestions: [
      { domain: "example.io", available: true },
      { domain: "myexample.app", available: true },
      { domain: "getexample.ai", available: false },
    ] as Suggestion[],
  },
  "openai.com": {
    status: { domain: "openai.com", available: false, statusRaw: "active", tld: "com" },
    prices: [
      { registrar: "Namecheap", priceUsd: 9.58, buyUrl: "https://www.namecheap.com/domains/registration/results/?domain=openai.com" },
      { registrar: "GoDaddy", priceUsd: 12.99, buyUrl: "https://www.godaddy.com/domainsearch/find?checkAvail=1&tmskey=&domainToCheck=openai.com" },
      { registrar: "Google Domains", priceUsd: 12.0, buyUrl: "https://domains.google.com/registrar/search?searchTerm=openai.com" },
    ],
    whois: {
      registrar: "MarkMonitor Inc.",
      createdAt: "2015-04-16T00:00:00Z",
      expiresAt: "2032-04-16T00:00:00Z",
      registrantCountry: "US",
      status: ["active"],
    },
    suggestions: [
      { domain: "openai.io", available: false },
      { domain: "openai.ai", available: false },
      { domain: "openai.app", available: false },
    ],
  },
  "mycoolstartup.io": {
    status: { domain: "mycoolstartup.io", available: true, statusRaw: "available", tld: "io" },
    prices: [
      { registrar: "Namecheap", priceUsd: 32.98, buyUrl: "https://www.namecheap.com/domains/registration/results/?domain=mycoolstartup.io" },
      { registrar: "GoDaddy", priceUsd: 49.99, buyUrl: "https://www.godaddy.com/domainsearch/find?checkAvail=1&tmskey=&domainToCheck=mycoolstartup.io" },
      { registrar: "Google Domains", priceUsd: 39.0, buyUrl: "https://domains.google.com/registrar/search?searchTerm=mycoolstartup.io" },
    ],
    whois: {},
    suggestions: [
      { domain: "mycoolstartup.app", available: true },
      { domain: "getmycoolstartup.com", available: true },
      { domain: "mycoolstartup.dev", available: true },
    ],
  },
} as const;

function getDemo(domain: string) {
  const key = domain.toLowerCase();
  return DEMO_FIXTURES[key as keyof typeof DEMO_FIXTURES];
}

type GoDaddyV2 = { domains?: Array<{ price?: number; purchasePrice?: number; salePrice?: number }>; price?: number; purchasePrice?: number; salePrice?: number } | Array<{ price?: number; purchasePrice?: number; salePrice?: number }>;

type GoDaddyV1Avail = { price?: number };

type GoDaddyV1Price = { amount?: number; price?: number };

function computeBuyUrl(registrar: string, domain: string): string {
  const r = registrar.toLowerCase();
  const d = encodeURIComponent(domain);
  if (r.includes("godaddy")) return `https://www.godaddy.com/domainsearch/find?checkAvail=1&tmskey=&domainToCheck=${d}`;
  return `https://duckduckgo.com/?q=${d}+domain+registration`;
}

async function getGoDaddyPrice(domain: string): Promise<RegistrarPrice | null> {
  const key = getEnv("GODADDY_API_KEY");
  const secret = getEnv("GODADDY_API_SECRET");
  if (!key || !secret) return null;
  const headers: Record<string, string> = {
    Authorization: `sso-key ${key}:${secret}`,
    Accept: "application/json",
    "X-Market-Id": "en-US",
  };

  const normalize = (amount: number | undefined): number => {
    const n = typeof amount === "number" ? amount : 0;
    if (!isFinite(n) || n <= 0) return 0;
    if (n >= 100000) return n / 1_000_000;
    if (n >= 100) return n / 100;
    return n;
  };

  try {
    const urlV2 = `https://api.godaddy.com/v2/domains/available?domain=${encodeURIComponent(domain)}&checkType=FAST&forTransfer=false`;
    const r = await fetchWithTimeout(urlV2, { ...nextFetchInit(), headers });
    if (r.ok) {
      const data = (await r.json()) as GoDaddyV2;
      const item = Array.isArray(data) ? data[0] : Array.isArray(data?.domains) ? data.domains[0] : data;
      const priceUsd = normalize(item?.price ?? item?.purchasePrice ?? item?.salePrice);
      if (priceUsd > 0) return { registrar: "GoDaddy", priceUsd, buyUrl: computeBuyUrl("GoDaddy", domain) };
    }
  } catch {}

  try {
    const urlV1Avail = `https://api.godaddy.com/v1/domains/available?domain=${encodeURIComponent(domain)}&checkType=FAST&forTransfer=false`;
    const r = await fetchWithTimeout(urlV1Avail, { ...nextFetchInit(), headers });
    if (r.ok) {
      const data = (await r.json()) as GoDaddyV1Avail;
      const priceUsd = normalize(data?.price);
      if (priceUsd > 0) return { registrar: "GoDaddy", priceUsd, buyUrl: computeBuyUrl("GoDaddy", domain) };
    }
  } catch {}

  try {
    const urlV1Price = `https://api.godaddy.com/v1/domains/price?domain=${encodeURIComponent(domain)}&currency=USD`;
    const r = await fetchWithTimeout(urlV1Price, { ...nextFetchInit(), headers });
    if (r.ok) {
      const data = (await r.json()) as GoDaddyV1Price;
      const priceUsd = normalize(data?.amount ?? data?.price);
      if (priceUsd > 0) return { registrar: "GoDaddy", priceUsd, buyUrl: computeBuyUrl("GoDaddy", domain) };
    }
  } catch {}

  return { registrar: "GoDaddy", priceUsd: 0, buyUrl: computeBuyUrl("GoDaddy", domain) };
}

export async function getDomainStatus(name: string): Promise<DomainStatus> {
  const tld = extractTld(name);
  if (isDemoMode()) {
    const demo = getDemo(name);
    if (demo) return demo.status;
    const rdap = await rdapLookup(name);
    return { domain: name, available: !rdap.exists, statusRaw: rdap.statusRaw, tld };
  }

  const clientId = getEnv("DOMAINR_API_KEY");
  const url = `https://api.domainr.com/v2/status?domain=${encodeURIComponent(
    name
  )}&client_id=${clientId}`;
  const res = await fetchWithTimeout(url, nextFetchInit());
  if (!res.ok) throw new Error("Domainr status failed");
  const json = (await res.json()) as { status?: Array<{ status?: string }> };
  const first = json?.status?.[0];
  const statusRaw: string = first?.status || "unknown";
  const available = /available|inactive|undelegated/i.test(statusRaw);
  return { domain: name, available, statusRaw, tld };
}

export async function getAlternatives(name: string): Promise<Suggestion[]> {
  if (isDemoMode()) {
    const demo = getDemo(name);
    if (demo) return [...demo.suggestions];
    const base = toKeyword(name);
    const tlds = ["com", "net", "org", "io", "ai", "app", "dev", "co", "xyz", "site"];
    const prefixes = ["", "get", "try", "join", "use", "go"];
    const suffixes = ["", "app", "hq", "labs", "tech", "ai"];
    const candidates = new Set<string>();
    for (const t of tlds) {
      candidates.add(`${base}.${t}`);
      candidates.add(`${base.replace(/-/g, "")}.${t}`);
      for (const p of prefixes) candidates.add(`${p ? p : ""}${p ? "" : ""}${p ? p : ""}${base}.${t}`.replace(/^(get|try|join|use|go){2,}/, "$1"));
      for (const s of suffixes) candidates.add(`${base}${s ? "-" + s : ""}.${t}`);
    }
    const list = Array.from(candidates)
      .filter((d) => /^[a-z0-9.-]+\.[a-z]{2,}$/.test(d))
      .slice(0, 24);
    const checks = await Promise.allSettled(list.map((d) => rdapLookup(d)));
    type Fulfilled = PromiseFulfilledResult<{ exists: boolean; statusRaw: string }>;
    const out: Suggestion[] = list.map((d, i) => {
      const r = checks[i];
      const available = r.status === "fulfilled" ? !(r as Fulfilled).value.exists : false;
      return { domain: d, available };
    });
    return out.filter((s) => s.available).slice(0, 12);
  }
  const clientId = getEnv("DOMAINR_API_KEY");
  const url = `https://api.domainr.com/v2/search?query=${encodeURIComponent(
    name
  )}&client_id=${clientId}`;
  const res = await fetchWithTimeout(url, nextFetchInit());
  if (!res.ok) throw new Error("Domainr search failed");
  const json = (await res.json()) as { results?: Array<{ domain?: string; host?: string; availability?: string; status?: string }> };
  const results: Suggestion[] = (json?.results || []).map((r) => {
    const s: string = r?.availability || r?.status || "unknown";
    const available = /available|inactive|undelegated/i.test(s);
    return { domain: r?.domain || r?.host || "", available };
  });
  return results.filter((r) => !!r.domain).slice(0, 12);
}

export async function getRegistrarPrices(_tld: string, domain?: string): Promise<RegistrarPrice[]> {
  if (!domain) return [];
  const gd = await getGoDaddyPrice(domain);
  if (gd) return [gd];
  return [
    {
      registrar: "GoDaddy",
      priceUsd: 0,
      buyUrl: computeBuyUrl("GoDaddy", domain),
    },
  ];
}

export async function getWhois(name: string): Promise<WhoisSummary> {
  if (isDemoMode()) {
    const demo = getDemo(name);
    if (demo) {
      const w = demo.whois as WhoisSummary;
      return {
        registrar: w.registrar,
        createdAt: w.createdAt,
        expiresAt: w.expiresAt,
        registrantCountry: w.registrantCountry,
        status: w.status ? [...w.status] : undefined,
      };
    }
  }

  const rdapCandidates: string[] = (() => {
    switch (extractTld(name)) {
      case "com":
        return [
          `https://rdap.verisign.com/com/v1/domain/${encodeURIComponent(name)}`,
          `https://rdap.org/domain/${encodeURIComponent(name)}`,
        ];
      case "net":
        return [
          `https://rdap.verisign.com/net/v1/domain/${encodeURIComponent(name)}`,
          `https://rdap.org/domain/${encodeURIComponent(name)}`,
        ];
      case "org":
        return [
          `https://rdap.publicinterestregistry.net/rdap/org/domain/${encodeURIComponent(name)}`,
          `https://rdap.org/domain/${encodeURIComponent(name)}`,
        ];
      case "io":
        return [
          `https://rdap.nic.io/domain/${encodeURIComponent(name)}`,
          `https://rdap.org/domain/${encodeURIComponent(name)}`,
        ];
      case "ai":
        return [
          `https://rdap.nic.ai/domain/${encodeURIComponent(name)}`,
          `https://rdap.org/domain/${encodeURIComponent(name)}`,
        ];
      case "app":
      case "dev":
        return [
          `https://rdap.nic.google/domain/${encodeURIComponent(name)}`,
          `https://rdap.org/domain/${encodeURIComponent(name)}`,
        ];
      case "co":
        return [
          `https://rdap.nic.co/domain/${encodeURIComponent(name)}`,
          `https://rdap.org/domain/${encodeURIComponent(name)}`,
        ];
      default:
        return [`https://rdap.org/domain/${encodeURIComponent(name)}`];
    }
  })();

  for (const url of rdapCandidates) {
    try {
      const res = await fetchWithTimeout(url, nextFetchInit());
      if (!res.ok) continue;
      type VCardRow = [string, ...unknown[]];
      const json = (await res.json()) as {
        events?: Array<{ eventAction?: string; eventDate?: string }>;
        entities?: Array<{
          roles?: string[];
          vcardArray?: [string, VCardRow[]];
          entities?: Array<{ vcardArray?: [string, VCardRow[]] }>;
        }>;
        status?: string[];
      };
      const events = json?.events || [];
      const createdAt = events.find((e) => e?.eventAction === "registration")?.eventDate;
      const expiresAt = events.find((e) => e?.eventAction === "expiration")?.eventDate;
      const entities = json?.entities || [];
      const registrarEntity = entities.find((e) => (e?.roles || []).includes("registrar"));
      const registrarCard = registrarEntity?.vcardArray?.[1] || registrarEntity?.entities?.[0]?.vcardArray?.[1] || [];
      const fnRow = Array.isArray(registrarCard) ? (registrarCard as VCardRow[]).find((v) => Array.isArray(v) && v[0] === "fn") : undefined;
      const registrar = fnRow?.[3] as string | undefined;
      const status: string[] = (json?.status || []).map((s) => String(s));
      return { registrar, createdAt, expiresAt, status };
    } catch {
      continue;
    }
  }
  return {};
}

export async function getScreenshotUrl(name: string): Promise<string> {
  return `/api/get-screenshot?name=${encodeURIComponent(name)}`;
}


