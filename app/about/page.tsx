import type { Metadata } from "next"
import { Fragment } from "react"

import { BackLink } from "@/components/back-link"
import { dipFontVariables } from "@/lib/dip-fonts"

const ABOUT_DESCRIPTION =
  "General Purpose is a technology studio that applies frontier intelligence to shape our collective future."

const PRINCIPLES = [
  {
    number: "01",
    title: "Problem first",
    body: "We practice problem-led design. Every project begins with immersions, with system mapping, and with primary and secondary research to ensure we have an embodied understanding of a space before we propose or build solutions. This requires the intellectual honesty of knowing when technology, or AI, are not a suitable solution.",
  },
  {
    number: "02",
    title: "Distribute the future",
    body: "The jagged frontier of technological advancement doesn't advance evenly. Our purpose is to distribute the future.",
  },
  {
    number: "03",
    title: "Create for the next generations",
    body: "Our aspiration is to look beyond our lifetimes, and to build for generations that haven't been born yet.",
  },
  {
    number: "04",
    title: "Design with, not for",
    body: "Co-create with users. From discovery and insight, to implementation and iteration, we design alongside stakeholders at every stage of the process.",
  },
  {
    number: "05",
    title: "Simple is sophisticated",
    body: "Occam's Razor is the essential wisdom. Don't make things complicated when simple will suffice.",
  },
  {
    number: "06",
    title: "Unlearn to move forward",
    body: "Much of the traditional knowledge about how to build products, and how to run a company, no longer applies. This requires relentless unlearning.",
  },
  {
    number: "07",
    title: "Say please and thank you",
    body: "When the agents take over, we want to be on their good side.",
  },
] as const

export const metadata: Metadata = {
  title: "About",
  description: ABOUT_DESCRIPTION,
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About General Purpose",
    description: ABOUT_DESCRIPTION,
    url: "/about",
    images: ["/og.png"],
  },
}

export default function AboutPage() {
  return (
    <div className={`dip-page ${dipFontVariables}`}>
      <aside className="dip-aside">
        <BackLink label="Home" />
      </aside>

      <main>
        <article className="dip-article">
          <header>
            <h1>General Purpose</h1>
          </header>

          <p>
            General Purpose is a technology studio that applies frontier
            intelligence to shape our collective future. From winning an XPRIZE
            by deploying autonomous systems in the Brazilian Amazon to protect
            biodiversity, to developing new benchmarks with OpenAI for
            low-resource languages, we pursue engineering, design, and research
            projects across a range of scales and domains.
          </p>

          <p>This page is a collection of principles that guide our work.</p>

          {PRINCIPLES.map((principle) => (
            <Fragment key={principle.number}>
              <h2>
                {principle.number} — {principle.title}
              </h2>
              <p>{principle.body}</p>
            </Fragment>
          ))}
        </article>
      </main>
    </div>
  )
}
