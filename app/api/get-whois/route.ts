import { NextRequest, NextResponse } from "next/server";
import net from "node:net";

export const runtime = "nodejs";

function parseWhoisText(text: string) {
  const getLine = (re: RegExp) => {
    const m = text.match(re);
    return m ? m[1].trim() : undefined;
  };
  const registrar = getLine(/Registrar:\s*(.+)/i) || getLine(/Sponsoring Registrar:\s*(.+)/i);
  const createdAt = getLine(/Creation Date:\s*([^\r\n]+)/i) || getLine(/Registered On:\s*([^\r\n]+)/i);
  const expiresAt = getLine(/Registry Expiry Date:\s*([^\r\n]+)/i) || getLine(/Expiry Date:\s*([^\r\n]+)/i);
  const registrantCountry = getLine(/Registrant Country:\s*([^\r\n]+)/i);
  const statusMatches = text.match(/Domain Status:\s*([^\r\n]+)/gi) || text.match(/^Status:\s*([^\r\n]+)/gim) || [];
  const status = statusMatches.map((s) => s.replace(/^(Domain Status:|Status:)\s*/i, "").split(" ")[0]);
  return { registrar, createdAt, expiresAt, registrantCountry, status: status.length ? status : undefined };
}

function tldOf(domain: string) {
  const parts = domain.toLowerCase().split(".").filter(Boolean);
  return parts.at(-1) || "";
}

function mapWhoisHost(domain: string): string[] {
  const tld = tldOf(domain);
  const hosts: string[] = [];
  // IANA first to get referral
  hosts.push("whois.iana.org");
  switch (tld) {
    case "com":
    case "net":
      hosts.push("whois.verisign-grs.com");
      break;
    case "org":
      hosts.push("whois.publicinterestregistry.net");
      break;
    case "io":
      hosts.push("whois.nic.io");
      break;
    case "ai":
      hosts.push("whois.nic.ai");
      break;
    case "co":
      hosts.push("whois.nic.co");
      break;
    case "dev":
    case "app":
      hosts.push("whois.nic.google");
      break;
    default:
      break;
  }
  return hosts;
}

async function whoisQuery(host: string, domain: string, timeoutMs = 7000): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port: 43 });
    let data = "";
    const done = (err?: Error) => {
      try { socket.destroy(); } catch { /* noop */ }
      if (err) reject(err); else resolve(data);
    };
    const timer = setTimeout(() => done(new Error("whois_timeout")), timeoutMs);
    socket.on("connect", () => {
      const query = host.includes("verisign") ? `domain ${domain}\r\n` : `${domain}\r\n`;
      socket.write(query);
    });
    socket.on("data", (chunk) => {
      data += chunk.toString("utf8");
    });
    socket.on("end", () => {
      clearTimeout(timer);
      done();
    });
    socket.on("error", (e) => {
      clearTimeout(timer);
      done(e);
    });
  });
}

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name");
  if (!name) return NextResponse.json({ error: "Missing name" }, { status: 400 });
  try {
    let text = "";
    let refer: string | undefined;
    // IANA query to find referral
    try {
      const iana = await whoisQuery("whois.iana.org", name, 5000);
      const m = iana.match(/whois:\s*([^\s]+)/i) || iana.match(/refer:\s*([^\s]+)/i);
      refer = m?.[1];
    } catch {}
    const hosts = [refer, ...mapWhoisHost(name)].filter(Boolean) as string[];
    for (const h of hosts) {
      try {
        text = await whoisQuery(h!, name, 7000);
        if (text && /domain name:/i.test(text)) break;
      } catch {}
    }
    let parsed: { registrar?: string; createdAt?: string; expiresAt?: string; registrantCountry?: string; status?: string[] } = text ? parseWhoisText(text) : {};

    // Scrape fallback (best-effort) from GoDaddy WHOIS page if still empty
    if (!parsed.registrar && !parsed.createdAt && !parsed.expiresAt) {
      try {
        const url = `https://www.godaddy.com/whois/results.aspx?domain=${encodeURIComponent(name)}`;
        const res = await fetch(url, {
          headers: {
            "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114 Safari/537.36",
            "accept-language": "en-US,en;q=0.9",
          },
        });
        if (res.ok) {
          const html = await res.text();
          const txt = html
            .replace(/<script[\s\S]*?<\/script>/gi, " ")
            .replace(/<style[\s\S]*?<\/style>/gi, " ")
            .replace(/<[^>]+>/g, " ")
            .replace(/&nbsp;/g, " ")
            .replace(/\s+/g, " ")
            .trim();
          const g = (re: RegExp) => {
            const m = txt.match(re);
            return m ? m[1].trim() : undefined;
          };
          const registrar = g(/Registrar:?\s*([^|]*?)\s*(Registered On:|Creation Date:|Updated On:|Expires On:|Registry Expiry Date:|Status:|$)/i);
          const createdAt = g(/(Registered On:|Creation Date:)\s*([^|]*?)(\s*Updated On:|\s*Expires On:|\s*Registry Expiry Date:|\s*Status:|$)/i);
          const expiresAt = g(/(Expires On:|Registry Expiry Date:)\s*([^|]*?)(\s*Status:|$)/i);
          const registrantCountry = g(/Registrant Country:?\s*([A-Z]{2})/i);
          const statusLine = g(/Status:?\s*([^|]*?)(\s*$|\s*DNSSEC:|\s*Name Server:)/i);
          const status = statusLine ? statusLine.split(/\s+/).filter(Boolean) : undefined;
          parsed = {
            registrar: registrar || parsed.registrar,
            createdAt: createdAt || parsed.createdAt,
            expiresAt: expiresAt || parsed.expiresAt,
            registrantCountry: registrantCountry || parsed.registrantCountry,
            status: status || parsed.status,
          };
        }
      } catch {}
    }

    if (!parsed.registrar && !parsed.createdAt && !parsed.expiresAt) {
      return NextResponse.json({ error: "WHOIS unavailable" }, { status: 502 });
    }
    return NextResponse.json(parsed);
  } catch (_e) {
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
}


