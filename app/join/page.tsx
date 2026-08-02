import type { Metadata } from "next"

import { BackLink } from "@/components/back-link"
import { JoinForm } from "@/components/join-form"
import { dipFontVariables } from "@/lib/dip-fonts"

export const metadata: Metadata = {
  title: "Stay close to what we're building",
  description:
    "Tell us a little about yourself and we'll keep you in the loop.",
  alternates: { canonical: "/join" },
  openGraph: {
    title: "Stay close to what we're building",
    description:
      "Tell us a little about yourself and we'll keep you in the loop.",
    url: "/join",
    images: ["/og.png"],
  },
}

export default function JoinPage() {
  return (
    <div className={`dip-page dip-page--join ${dipFontVariables}`}>
      <aside className="dip-aside">
        <BackLink label="Home" />
      </aside>

      <main>
        <section className="dip-article join-page">
          <header>
            <h1>Stay close to what we&apos;re building.</h1>
            <p className="join-subtitle">
              Tell us a little about yourself and we&apos;ll keep you in the
              loop.
            </p>
          </header>
          <JoinForm />
        </section>
      </main>
    </div>
  )
}
