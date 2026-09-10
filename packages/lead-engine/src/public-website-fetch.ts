type Fetch = typeof fetch;

const PRIVATE_HOST = /^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.|198\.(18|19)\.|0\.|\[?::1\]?|\[?(fc|fd|fe8|fe9|fea|feb))/i;

type StoredCookie = {
  name: string;
  value: string;
  domain: string;
  hostOnly: boolean;
  path: string;
  secure: boolean;
};

export type PublicWebsiteResponse = { response: Response; finalUrl: string };

export function normalizePublicWebsiteUrl(input: string): string {
  const withProtocol = /^https?:\/\//i.test(input) ? input : `https://${input}`;
  const url = new URL(withProtocol);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    PRIVATE_HOST.test(url.hostname) ||
    url.username ||
    url.password
  ) {
    throw new Error("Website URL must use HTTP(S), a public hostname, and no embedded credentials.");
  }
  url.hash = "";
  return url.toString();
}

function readSetCookies(headers: Headers): string[] {
  const extendedHeaders = headers as Headers & { getSetCookie?: () => string[] };
  return extendedHeaders.getSetCookie?.() ?? (headers.get("set-cookie") ? [headers.get("set-cookie") as string] : []);
}

function defaultCookiePath(url: URL): string {
  const lastSlash = url.pathname.lastIndexOf("/");
  return lastSlash <= 0 ? "/" : url.pathname.slice(0, lastSlash);
}

function cookieDomainMatches(hostname: string, cookie: StoredCookie): boolean {
  return cookie.hostOnly ? hostname === cookie.domain : hostname === cookie.domain || hostname.endsWith(`.${cookie.domain}`);
}

function cookiePathMatches(pathname: string, cookiePath: string): boolean {
  return pathname === cookiePath || pathname.startsWith(cookiePath.endsWith("/") ? cookiePath : `${cookiePath}/`);
}

function rememberCookies(jar: Map<string, StoredCookie>, requestUrl: string, headers: Headers): void {
  const url = new URL(requestUrl);
  for (const rawCookie of readSetCookies(headers)) {
    const [pair, ...attributes] = rawCookie.split(";").map((part) => part.trim());
    const separator = pair?.indexOf("=") ?? -1;
    if (!pair || separator <= 0) continue;

    const name = pair.slice(0, separator);
    const value = pair.slice(separator + 1);
    let domain = url.hostname.toLowerCase();
    let hostOnly = true;
    let path = defaultCookiePath(url);
    let secure = false;
    let expired = false;

    for (const attribute of attributes) {
      const [rawName, ...rawValue] = attribute.split("=");
      const attributeName = rawName?.toLowerCase();
      const attributeValue = rawValue.join("=").trim();
      if (attributeName === "domain" && attributeValue) {
        const candidateDomain = attributeValue.replace(/^\./, "").toLowerCase();
        const hostname = url.hostname.toLowerCase();
        if (hostname === candidateDomain || hostname.endsWith(`.${candidateDomain}`)) {
          domain = candidateDomain;
          hostOnly = false;
        }
      } else if (attributeName === "path" && attributeValue.startsWith("/")) {
        path = attributeValue;
      } else if (attributeName === "secure") {
        secure = true;
      } else if (attributeName === "max-age" && Number(attributeValue) <= 0) {
        expired = true;
      }
    }

    const key = `${domain}|${path}|${name}`;
    if (expired || value === "") jar.delete(key);
    else jar.set(key, { name, value, domain, hostOnly, path, secure });
  }
}

function cookieHeader(jar: Map<string, StoredCookie>, requestUrl: string): string | undefined {
  const url = new URL(requestUrl);
  const cookies = [...jar.values()].filter(
    (cookie) =>
      cookieDomainMatches(url.hostname.toLowerCase(), cookie) &&
      cookiePathMatches(url.pathname, cookie.path) &&
      (!cookie.secure || url.protocol === "https:"),
  );
  if (cookies.length === 0) return undefined;
  return cookies.map(({ name, value }) => `${name}=${value}`).join("; ");
}

function alternateProtocolUrl(url: string): string {
  const alternate = new URL(url);
  alternate.protocol = alternate.protocol === "https:" ? "http:" : "https:";
  return alternate.toString();
}

export function createPublicWebsiteClient(options: { fetchImpl?: Fetch; userAgent: string }) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const cookieJar = new Map<string, StoredCookie>();

  async function fetchRedirectChain(initialUrl: string, signal: AbortSignal): Promise<PublicWebsiteResponse> {
    let currentUrl = initialUrl;
    for (let redirectCount = 0; redirectCount <= 8; redirectCount += 1) {
      const headers: Record<string, string> = { "User-Agent": options.userAgent };
      const cookies = cookieHeader(cookieJar, currentUrl);
      if (cookies) headers.Cookie = cookies;

      const response = await fetchImpl(currentUrl, { redirect: "manual", signal, headers });
      rememberCookies(cookieJar, currentUrl, response.headers);
      if (response.status < 300 || response.status >= 400) {
        return { response, finalUrl: response.url || currentUrl };
      }

      const location = response.headers.get("location");
      if (!location) return { response, finalUrl: response.url || currentUrl };
      currentUrl = normalizePublicWebsiteUrl(new URL(location, currentUrl).toString());
    }
    throw new Error("Website redirect limit exceeded");
  }

  return {
    async fetch(input: string, signal: AbortSignal): Promise<PublicWebsiteResponse> {
      const normalized = normalizePublicWebsiteUrl(input);
      try {
        return await fetchRedirectChain(normalized, signal);
      } catch (primaryError) {
        if (signal.aborted || !(primaryError instanceof TypeError)) throw primaryError;
        try {
          return await fetchRedirectChain(alternateProtocolUrl(normalized), signal);
        } catch (alternateError) {
          throw new AggregateError([primaryError, alternateError], "HTTPS and HTTP website requests failed");
        }
      }
    },
  };
}
