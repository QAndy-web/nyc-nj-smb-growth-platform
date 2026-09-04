---
name: nextjs-seo
description: Implement SEO correctly in this Next.js App Router monorepo. Use for metadata, canonical and alternate URLs, robots, sitemap, JSON-LD, service/location pages, social previews, image optimization, and fixes produced by an SEO audit.
---

# Next.js SEO implementation

Use App Router conventions and keep SEO data server-rendered. Prefer the Metadata API or `generateMetadata`, `app/robots.ts`, and `app/sitemap.ts` over ad hoc head tags. Define a canonical URL strategy before generating routes, and make environment-dependent base URLs explicit.

Create service and location pages only when each page has verified, useful, genuinely distinct content. Do not generate thin city-name swaps or doorway pages. Keep navigation and internal links consistent with the public route hierarchy.

Add JSON-LD as valid serialized data derived from verified records. Use the most accurate LocalBusiness subtype available and omit unknown fields. Never invent reviews, aggregate ratings, addresses, prices, geo coordinates, opening hours, or social profiles.

Set meaningful titles, descriptions, Open Graph data, image dimensions/alternatives, canonical URLs, and index directives. Keep private Growth OS routes and non-public previews out of public indexing. Ensure sitemap entries are canonical, public, and actually routable.

Validate rendered metadata and JSON-LD in a browser, test robots and sitemap responses, run typecheck/tests/build, and check affected public pages at mobile and desktop widths. An external submission to Search Console, a Google Business Profile edit, or production publication requires explicit user authorization.

This is a project-specific skill chosen instead of a generic React SEO package so it follows this repository's App Router, data truthfulness, and approval boundaries.
