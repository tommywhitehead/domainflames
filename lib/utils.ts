import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getEnv(name: string): string | undefined {
  const env: Record<string, string> | undefined =
    typeof process !== "undefined" && (process as any)?.env
      ? ((process as any).env as Record<string, string>)
      : undefined;
  const value = env?.[name];
  return value && value.length > 0 ? value : undefined;
}

export function isDemoMode(): boolean {
  // DEMO_MODE if any of the required keys are missing
  const required = [
    "DOMAINR_API_KEY",
    "TLDLIST_API_KEY",
    "SCREENSHOTONE_API_KEY",
  ];
  return required.some((k) => !getEnv(k));
}

export function sanitizeDomainInput(input: string): string {
  const trimmed = input.trim().toLowerCase();
  // allow a-z 0-9 - .
  const sanitized = trimmed.replace(/[^a-z0-9.-]/g, "");
  return sanitized;
}

export function isLikelyValidDomain(input: string): boolean {
  if (!input) return false;
  // basic check: contains a dot and labels are not empty
  if (!input.includes(".")) return false;
  if (input.startsWith("-") || input.endsWith("-")) return false;
  if (input.length > 253) return false;
  const labels = input.split(".");
  if (labels.some((l) => l.length === 0 || l.length > 63)) return false;
  return /^[a-z0-9.-]+$/.test(input);
}
