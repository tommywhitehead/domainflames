import { NextRequest, NextResponse } from "next/server";
import chromium from "@sparticuz/chromium";
import puppeteerCore from "puppeteer-core";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name");
  if (!name) return NextResponse.json({ error: "Missing name" }, { status: 400 });
  try {
    // Decide engine: use system/bundled Chromium via puppeteer on local dev (mac/win),
    // use puppeteer-core + @sparticuz/chromium on serverless/linux.
    const isServerlessLinux = process.platform === "linux" && !!process.env.AWS_EXECUTION_ENV;
    const browser = await (async () => {
      if (!isServerlessLinux) {
        const puppeteer = (await import("puppeteer")).default;
        return puppeteer.launch({
          headless: true,
          defaultViewport: { width: 1366, height: 768 },
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });
      }
      const exe = (await chromium.executablePath()) || process.env.CHROMIUM_PATH || undefined;
      return puppeteerCore.launch({
        args: chromium.args,
        defaultViewport: { width: 1366, height: 768 },
        executablePath: exe,
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
      });
    })();
    try {
      const page = await browser.newPage();
      await page.setUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
      );
      const targets = [`https://${name}`, `http://${name}`];
      let loaded = false;
      for (const url of targets) {
        try {
          await page.goto(url, { waitUntil: "domcontentloaded", timeout: 12000 });
          loaded = true;
          break;
        } catch {
          // try next protocol
        }
      }
      if (!loaded) {
        const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='1366' height='768'>
          <rect width='100%' height='100%' fill='#f2f2f2'/>
          <text x='50%' y='48%' dominant-baseline='middle' text-anchor='middle' font-family='system-ui, -apple-system, Segoe UI, Roboto' font-size='28' fill='#555'>No preview</text>
          <text x='50%' y='56%' dominant-baseline='middle' text-anchor='middle' font-family='system-ui, -apple-system, Segoe UI, Roboto' font-size='20' fill='#777'>${name}</text>
        </svg>`;
        return new NextResponse(svg, { headers: { "content-type": "image/svg+xml" } });
      }
      // small delay to allow above-the-fold content to settle
      await new Promise((r) => setTimeout(r, 1200));
      const buf = await page.screenshot({ type: "png" });
      return new NextResponse(buf, { headers: { "content-type": "image/png" } });
    } finally {
      await browser.close();
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Lookup failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}


