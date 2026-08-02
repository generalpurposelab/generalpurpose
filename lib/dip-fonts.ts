import localFont from "next/font/local"

const dipInter = localFont({
  src: "../app/fonts/dip-inter-latin.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
  variable: "--font-dip-inter",
})

const dipNewsreader = localFont({
  src: "../app/fonts/dip-newsreader-italic-latin.woff2",
  weight: "200 800",
  style: "italic",
  display: "swap",
  variable: "--font-dip-newsreader",
})

export const dipFontVariables = `${dipInter.variable} ${dipNewsreader.variable}`
