import "server-only"

const configuredSiteUrl =
  process.env.SITE_URL ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.VERCEL_PROJECT_PRODUCTION_URL ??
  "http://localhost:3000"

const siteUrlWithProtocol = configuredSiteUrl.startsWith("http")
  ? configuredSiteUrl
  : `https://${configuredSiteUrl}`

export const SITE_NAME = "General Purpose"
export const SITE_DESCRIPTION =
  "General Purpose builds frontier intelligence for the planet's most pressing challenges."
export const SITE_TAGLINE =
  "Frontier intelligence for the planet's most pressing challenges."
export const SITE_URL = new URL(siteUrlWithProtocol)

export function absoluteUrl(pathname: string): string {
  return new URL(pathname, SITE_URL).toString()
}
