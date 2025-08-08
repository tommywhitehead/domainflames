export type DomainStatus = {
  domain: string;
  available: boolean;
  statusRaw: string;
  tld: string;
};

export type RegistrarPrice = {
  registrar: string;
  priceUsd: number;
  buyUrl: string;
};

export type WhoisSummary = {
  registrar?: string;
  createdAt?: string; // ISO
  expiresAt?: string; // ISO
  registrantCountry?: string;
  status?: string[];
};

export type Suggestion = { domain: string; available: boolean };

export type ApiError = { error: string };

export type ApiResult<T> = T | ApiError;


