import { normalizePublicWebsiteUrl } from "./website-audit";
import type { ContactEnrichment, ContactSource } from "./types";

type Fetch = typeof fetch;
const EMAIL_PATTERN = /[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+/gi;
const CONTACT_PATH = /(contact|about|team|support|get-in-touch|appointments?)/i;

function cleanHtml(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/&#64;|&commat;/gi, "@")
    .replace(/&#46;|&period;/gi, ".");
}

function validListedEmail(email: string): boolean {
  const lower = email.toLowerCase();
  return !lower.startsWith("noreply@") && !lower.startsWith("no-reply@") && !/\.(png|jpg|jpeg|gif|svg|webp)$/i.test(lower);
}

export function extractPublicEmails(html: string, sourceUrl: string): ContactSource[] {
  const cleaned = cleanHtml(html);
  const unique = new Map<string, ContactSource>();
  for (const match of cleaned.matchAll(EMAIL_PATTERN)) {
    const email = match[0].toLowerCase().replace(/[),.;:]+$/, "");
    if (!validListedEmail(email)) continue;
    const isMailto = new RegExp(`mailto:${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i").test(cleaned);
    unique.set(email, {
      email,
      sourceUrl,
      extractionMethod: isMailto ? "mailto" : "page_text",
      confidence: isMailto ? "high" : "medium",
    });
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
      const response = await fetchImpl(sourceUrl, {
        redirect: "follow",
        signal: controller.signal,
        headers: { "User-Agent": "NYCNJ-SMB-Public-Contact-Finder/1.0" },
      });
      if (!response.ok || !(response.headers.get("content-type") ?? "").includes("text/html")) continue;
      const finalUrl = response.url || sourceUrl;
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
