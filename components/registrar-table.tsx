import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import type { RegistrarPrice } from "@/lib/types";

export function RegistrarTable({ prices, showCta = false }: { prices: RegistrarPrice[]; showCta?: boolean }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Registrar</TableHead>
          <TableHead>Price</TableHead>
          {showCta && <TableHead className="text-right">Action</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {prices.map((p) => (
          <TableRow key={`${p.registrar}-${p.buyUrl}`}>
            <TableCell>{p.registrar}</TableCell>
            <TableCell>{p.priceUsd > 0 ? `$${p.priceUsd.toFixed(2)}` : "—"}</TableCell>
            {showCta && (
              <TableCell className="text-right">
                <a href={p.buyUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="default">Buy</Button>
                </a>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}


