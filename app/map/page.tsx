import type { Metadata } from "next"

import { LanguageAtlas } from "./language-atlas"

export const metadata: Metadata = {
  title: "Glottomap",
  description:
    "A global atlas of language technology coverage across text, translation, speech, datasets, and multilingual evaluations.",
  alternates: { canonical: "/map" },
}

export default function MapPage() {
  return <LanguageAtlas />
}
