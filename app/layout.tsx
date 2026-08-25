import type { Metadata } from "next"

import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site"

import "./globals.css"

export const metadata: Metadata = {
  metadataBase: SITE_URL,
  applicationName: SITE_NAME,
  title: {
    default: SITE_NAME,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  creator: SITE_NAME,
  publisher: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_TAGLINE,
    url: "/",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "General Purpose — Frontier intelligence for the planet's most pressing challenges.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_TAGLINE,
    images: ["/og.png"],
  },
}

// Respect an explicit choice first, then follow the system preference.
const themeInitScript = `try{var k="general-purpose-home-theme";var q=matchMedia("(prefers-color-scheme: dark)");var s=function(t){document.documentElement.dataset.theme=t;window.dispatchEvent(new Event("general-purpose-theme-change"))};var a=localStorage.getItem(k);s(a==="dark"||a==="light"?a:q.matches?"dark":"light");q.addEventListener("change",function(){if(!localStorage.getItem(k))s(q.matches?"dark":"light")})}catch(e){}`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {children}
      </body>
    </html>
  )
}
