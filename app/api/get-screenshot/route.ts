import { NextRequest, NextResponse } from "next/server";
import chromium from "@sparticuz/chromium";
import puppeteerCore from "puppeteer-core";
import puppeteer from "puppeteer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function createBrowser() {
  // Try @sparticuz/chromium first (for Vercel/production)
  try {
    const executablePath = await chromium.executablePath();
    return await puppeteerCore.launch({
      args: [
        ...chromium.args,
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
      ],
      defaultViewport: { width: 1366, height: 768 },
      executablePath,
      headless: true,
    });
  } catch (error) {
    console.log("Failed to use @sparticuz/chromium, falling back to puppeteer:", error);
    
    // Fallback to regular puppeteer (for local development)
    try {
      return await puppeteer.launch({
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
        ],
        defaultViewport: { width: 1366, height: 768 },
        headless: true,
      });
    } catch (fallbackError) {
      console.error("Both puppeteer setups failed:", fallbackError);
      throw new Error("No working puppeteer configuration found");
    }
  }
}

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name");
  if (!name) return NextResponse.json({ error: "Missing name" }, { status: 400 });
  
  // Add cache-busting parameter to force fresh screenshots
  const _cacheBuster = req.nextUrl.searchParams.get("cb") || Date.now().toString();
  
  try {
    const browser = await createBrowser();

    try {
      const page = await browser.newPage();
      
      // Set a realistic user agent
      await page.setUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      );
      
      // Try HTTPS first, then HTTP
      const targets = [`https://${name}`, `http://${name}`];
      let loaded = false;
      
      for (const url of targets) {
        try {
          await page.goto(url, { 
            waitUntil: "domcontentloaded", 
            timeout: 10000 
          });
          loaded = true;
          break;
        } catch (error) {
          console.log(`Failed to load ${url}:`, error);
          continue;
        }
      }
      
      if (!loaded) {
        // Return a fallback SVG if we can't load the page
        const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='1366' height='768'>
          <rect width='100%' height='100%' fill='#f8f9fa'/>
          <text x='50%' y='45%' dominant-baseline='middle' text-anchor='middle' font-family='system-ui, -apple-system, Segoe UI, Roboto' font-size='24' fill='#6c757d'>No preview available</text>
          <text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' font-family='system-ui, -apple-system, Segoe UI, Roboto' font-size='16' fill='#adb5bd'>${name}</text>
        </svg>`;
        return new NextResponse(svg, { 
          headers: { 
            "content-type": "image/svg+xml",
            "cache-control": "no-cache, no-store, must-revalidate",
            "pragma": "no-cache",
            "expires": "0"
          } 
        });
      }
      
      // Wait a bit for content to settle
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Take screenshot
      const screenshot = await page.screenshot({ 
        type: "png",
        fullPage: false
      });
      
      return new NextResponse(Buffer.from(screenshot), { 
        headers: { 
          "content-type": "image/png",
          "cache-control": "no-cache, no-store, must-revalidate",
          "pragma": "no-cache",
          "expires": "0"
        } 
      });
      
    } finally {
      await browser.close();
    }
    
  } catch (error) {
    console.error("Screenshot error for domain:", name, error);
    
    // Return a fallback SVG on any error
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='1366' height='768'>
      <rect width='100%' height='100%' fill='#f8f9fa'/>
      <text x='50%' y='45%' dominant-baseline='middle' text-anchor='middle' font-family='system-ui, -apple-system, Segoe UI, Roboto' font-size='24' fill='#6c757d'>Screenshot unavailable</text>
      <text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' font-family='system-ui, -apple-system, Segoe UI, Roboto' font-size='16' fill='#adb5bd'>${name}</text>
      <text x='50%' y='65%' dominant-baseline='middle' text-anchor='middle' font-family='system-ui, -apple-system, Segoe UI, Roboto' font-size='12' fill='#adb5bd'>Error: ${error instanceof Error ? error.message : 'Unknown error'}</text>
    </svg>`;
    
    return new NextResponse(svg, { 
      headers: { 
        "content-type": "image/svg+xml",
        "cache-control": "no-cache, no-store, must-revalidate",
        "pragma": "no-cache",
        "expires": "0"
      } 
    });
  }
}


