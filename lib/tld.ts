// Simple TLD extraction. MVP: last label after the final dot.
// TODO: Integrate a public suffix list for accurate multi-part TLDs.

export function extractTld(domain: string): string {
  const parts = domain.toLowerCase().split(".").filter(Boolean);
  if (parts.length < 2) return "";
  // naive: take the last part
  return parts[parts.length - 1];
}

export function extractRegistrableDomain(domain: string): string {
  // naive: last two labels
  const parts = domain.toLowerCase().split(".").filter(Boolean);
  if (parts.length < 2) return domain.toLowerCase();
  return parts.slice(-2).join(".");
}


