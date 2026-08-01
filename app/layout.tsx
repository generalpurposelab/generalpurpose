import type { Metadata } from "next"

import "./globals.css"

export const metadata: Metadata = {
  title: "General Purpose",
  description: "Dip is a technology lab and holding company.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
