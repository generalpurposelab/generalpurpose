import type { Metadata } from "next"

import { BackLink } from "@/components/back-link"
import { ThemeToggle } from "@/components/theme-toggle"
import { dipFontVariables } from "@/lib/dip-fonts"

export const metadata: Metadata = {
  title: "About",
  description: "Learn more about General Purpose.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About General Purpose",
    description: "Learn more about General Purpose.",
    url: "/about",
    images: ["/og.png"],
  },
}

export default function AboutPage() {
  return (
    <div className={`dip-page ${dipFontVariables}`}>
      <ThemeToggle />
      <aside className="dip-aside">
        <BackLink label="Home" />
      </aside>

      <main>
        <article className="dip-article">
          <header>
            <h1>General Purpose</h1>
          </header>

          <p>
            General Purpose is a design and technology studio applying frontier
            intelligence to some of the world&apos;s most pressing challenges.
          </p>

          <h2>Our approach</h2>
          <p>
            We work across design, research, and engineering to turn emerging
            capabilities into useful systems for people and the planet.
          </p>

          <h2>More soon</h2>
          <p>
            This page is a starting point. More about the studio, its
            collaborators, and its work will be added here.
          </p>
        </article>
      </main>
    </div>
  )
}
