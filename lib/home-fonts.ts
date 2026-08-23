import localFont from "next/font/local"

const exposure = localFont({
  src: "../app/fonts/exposure-trial-var.ttf",
  display: "swap",
  variable: "--font-exposure",
})

export const exposureFontVariable = exposure.variable
