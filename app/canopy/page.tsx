import Link from "next/link"

import { CanopyGlobe } from "@/components/canopy-globe"

export default function CanopyPage() {
  return (
    <main className="canopy-page">
      <Link className="canopy-back" href="/">
        General Purpose
      </Link>

      <section className="canopy-stage" aria-labelledby="canopy-title">
        <h1 id="canopy-title" className="canopy-title">
          Canopy
        </h1>
        <CanopyGlobe />
        <p className="canopy-instruction">Drag to explore</p>
      </section>
    </main>
  )
}
