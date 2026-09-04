import { describe, expect, it } from "vitest";
import { extractOfficialContactLinks, extractPublicEmails } from "./email-enrichment";

describe("public contact parsing", () => {
  it("extracts only emails present on the public page and keeps the source URL", () => {
    const sourceUrl = "https://example.com/contact";
    const contacts = extractPublicEmails(
      '<a href="mailto:Hello@Example.com">Email us</a><p>sales@example.com</p><p>noreply@example.com</p>',
      sourceUrl,
    );

    expect(contacts).toEqual([
      { email: "hello@example.com", sourceUrl, extractionMethod: "mailto", confidence: "high" },
      { email: "sales@example.com", sourceUrl, extractionMethod: "page_text", confidence: "medium" },
    ]);
  });

  it("follows contact links only on the same official origin", () => {
    const links = extractOfficialContactLinks(
      '<a href="/contact">Contact</a><a href="https://example.com/about">About</a><a href="https://other.com/contact">Other</a>',
      "https://example.com",
    );
    expect(links).toEqual(["https://example.com/contact", "https://example.com/about"]);
  });

  it("does not mistake URLs, package versions, or coordinates for emails", () => {
    const contacts = extractPublicEmails(
      `<a href="https://www.google.com/maps/place/Test/@40.73404,-74.1">Map</a>
       <script src="https://cdn.jsdelivr.net/npm/swiper@1.8.1/index.js"></script>
       <p>Directions: jersey+city/@40.734362</p>
       <p>office@example.com</p>`,
      "https://example.com/contact",
    );

    expect(contacts).toEqual([
      {
        email: "office@example.com",
        sourceUrl: "https://example.com/contact",
        extractionMethod: "page_text",
        confidence: "medium",
      },
    ]);
  });

  it("prefers a public mailto link over the same email repeated in page text", () => {
    const contacts = extractPublicEmails(
      '<a href="mailto:Office%40Example.com?subject=Appointment">office@example.com</a>',
      "https://example.com/contact",
    );

    expect(contacts).toEqual([
      {
        email: "office@example.com",
        sourceUrl: "https://example.com/contact",
        extractionMethod: "mailto",
        confidence: "high",
      },
    ]);
  });
});
