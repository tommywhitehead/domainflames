import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WhoisSummary } from "@/lib/types";

export function WhoisCard({ whois }: { whois: WhoisSummary }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>WHOIS</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-2">
          <dt className="text-muted-foreground">Registrar</dt>
          <dd>{whois.registrar ?? "Unavailable"}</dd>

          <dt className="text-muted-foreground">Registered on</dt>
          <dd>{whois.createdAt ? new Date(whois.createdAt).toLocaleDateString() : "Unavailable"}</dd>

          <dt className="text-muted-foreground">Expires on</dt>
          <dd>{whois.expiresAt ? new Date(whois.expiresAt).toLocaleDateString() : "Unavailable"}</dd>

          <dt className="text-muted-foreground">Registrant Country</dt>
          <dd>{whois.registrantCountry ?? "Unavailable"}</dd>

          <dt className="text-muted-foreground">Status</dt>
          <dd>{whois.status && whois.status.length > 0 ? whois.status.join(", ") : "Unavailable"}</dd>
        </dl>
      </CardContent>
    </Card>
  );
}


