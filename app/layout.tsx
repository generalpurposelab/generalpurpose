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

const themeInitScript = `try{var t=localStorage.getItem("general-purpose-home-theme");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}`

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
