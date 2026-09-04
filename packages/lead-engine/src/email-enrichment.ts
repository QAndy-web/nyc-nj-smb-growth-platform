import { createPublicWebsiteClient, normalizePublicWebsiteUrl } from "./public-website-fetch";
import type { ContactEnrichment, ContactSource } from "./types";

type Fetch = typeof fetch;
const EMAIL_PATTERN = /[a-z0-9.!#$%&'*+=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z](?:[a-z0-9-]{0,61}[a-z0-9]))+/gi;
const VALID_EMAIL_PATTERN = /^[a-z0-9.!#$%&'*+=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z](?:[a-z0-9-]{0,61}[a-z0-9]))+$/i;
const CONTACT_PATH = /(contact|about|team|support|get-in-touch|appointments?)/i;

function visiblePageText(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#64;|&commat;/gi, "@")
    .replace(/&#46;|&period;/gi, ".")
    .replace(/&nbsp;|&#160;/gi, " ");
}

function validListedEmail(email: string): boolean {
  const lower = email.toLowerCase();
  return (
    VALID_EMAIL_PATTERN.test(lower) &&
    !lower.startsWith("noreply@") &&
    !lower.startsWith("no-reply@") &&
    !/\.(png|jpg|jpeg|gif|svg|webp)$/i.test(lower)
  );
}

export function extractPublicEmails(html: string, sourceUrl: string): ContactSource[] {
  const unique = new Map<string, ContactSource>();

  for (const match of html.matchAll(/href=["']mailto:([^"'#?]+)(?:\?[^"']*)?["']/gi)) {
    let decoded = match[1];
    try {
      decoded = decodeURIComponent(decoded);
    } catch {
      // Keep the literal public value when malformed percent-encoding is present.
    }
    for (const candidate of decoded.split(/[,;]/)) {
      const email = candidate.trim().toLowerCase();
      if (!validListedEmail(email)) continue;
      unique.set(email, { email, sourceUrl, extractionMethod: "mailto", confidence: "high" });
    }
  }

  for (const match of visiblePageText(html).matchAll(EMAIL_PATTERN)) {
    const email = match[0].toLowerCase().replace(/[),.;:]+$/, "");
    if (!validListedEmail(email)) continue;
    if (!unique.has(email)) {
      unique.set(email, { email, sourceUrl, extractionMethod: "page_text", confidence: "medium" });
    }
  }
  return [...unique.values()];
}

export function extractOfficialContactLinks(html: string, pageUrl: string): string[] {
  const base = new URL(pageUrl);
  const links = new Set<string>();
  for (const match of html.matchAll(/<a\b[^>]+href=["']([^"']+)["']/gi)) {
    try {
      const url = new URL(match[1], base);
      if (url.origin === base.origin && CONTACT_PATH.test(`${url.pathname}${url.search}`)) {
        url.hash = "";
        links.add(url.toString());
      }
    } catch {
      // Ignore malformed links from the public page.
    }
  }
  return [...links];
}

export async function enrichPublicBusinessContacts(
  websiteUrl: string | null,
  options: { fetchImpl?: Fetch; maxPages?: number; timeoutMs?: number } = {},
): Promise<ContactEnrichment> {
  if (!websiteUrl) return { status: "skipped", contacts: [], pagesScanned: [], error: null };

  let homepage: string;
  try {
    homepage = normalizePublicWebsiteUrl(websiteUrl);
  } catch (error) {
    return { status: "error", contacts: [], pagesScanned: [], error: error instanceof Error ? error.message : "Invalid website URL" };
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const client = createPublicWebsiteClient({
    fetchImpl,
    userAgent: "NYCNJ-SMB-Public-Contact-Finder/1.0",
  });
  const queue = [homepage];
  const visited = new Set<string>();
  const contacts = new Map<string, ContactSource>();
  const errors: string[] = [];

  while (queue.length > 0 && visited.size < (options.maxPages ?? 4)) {
    const sourceUrl = queue.shift();
    if (!sourceUrl || visited.has(sourceUrl)) continue;
    visited.add(sourceUrl);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 7_000);
    try {
      const { response, finalUrl } = await client.fetch(sourceUrl, controller.signal);
      if (!response.ok || !(response.headers.get("content-type") ?? "").includes("text/html")) continue;
      const html = (await response.text()).slice(0, 1_000_000);
      for (const contact of extractPublicEmails(html, finalUrl)) {
        contacts.set(`${contact.email}|${contact.sourceUrl}`, contact);
      }
      if (visited.size === 1) queue.push(...extractOfficialContactLinks(html, finalUrl));
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Page request failed");
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    status: contacts.size > 0 ? "found" : errors.length === visited.size ? "error" : "not_found",
    contacts: [...contacts.values()],
    pagesScanned: [...visited],
    error: errors.length > 0 ? errors.join("; ").slice(0, 500) : null,
  };
}
