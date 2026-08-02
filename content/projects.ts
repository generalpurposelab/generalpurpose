import "server-only"

import type { IdentityPattern } from "@/components/gp-product-scales"

export type ProjectStat = {
  label: string
  value: string
}

export type ProjectSection = {
  id: string
  title: string
  paragraphs: readonly string[]
  points?: readonly string[]
  stats?: readonly ProjectStat[]
}

export type ProjectSource = {
  label: string
  href: string
}

export type ProjectPost = {
  slug: string
  title: string
  category: string
  period: string
  publishedAt: string
  indexDate: string
  indexDateLabel: string
  indexLabel?: string
  summary: string
  challenge: string
  pattern: IdentityPattern
  hero: "globe" | "rainforest"
  sections: readonly ProjectSection[]
  sources: readonly ProjectSource[]
}

export const projects = [
  {
    slug: "uhura",
    title: "Uhura",
    category: "Multilingual AI",
    period: "Published December 2024",
    publishedAt: "2024-12-01",
    indexDate: "2024-12-01",
    indexDateLabel: "Dec",
    indexLabel: undefined,
    summary:
      "A benchmark for testing scientific reasoning and truthfulness across six African languages.",
    challenge: "trustworthy AI across every language.",
    pattern: "canopy",
    hero: "globe",
    sections: [
      {
        id: "why-uhura",
        title: "Why Uhura",
        paragraphs: [
          "Language models are commonly evaluated in English and a small group of other high-resource languages. That leaves major blind spots in how reliably these systems reason, answer technical questions, and avoid false claims for much of the world.",
          "Uhura makes that gap measurable. It provides a shared benchmark for asking whether a model remains useful and truthful when the language changes, not only when the question does.",
        ],
      },
      {
        id: "benchmark",
        title: "Two tests, six languages",
        paragraphs: [
          "The benchmark pairs two complementary evaluations. Uhura-ARC-Easy measures multiple-choice scientific question answering. Uhura-TruthfulQA tests whether models repeat common misconceptions across sensitive subjects including health, law, finance, and politics.",
          "Each task was translated by people into Amharic, Hausa, Northern Sotho, Swahili, Yoruba, and Zulu, creating comparable evaluations across typologically diverse languages.",
        ],
        points: [
          "Scientific reasoning through Uhura-ARC-Easy",
          "Factual reliability through Uhura-TruthfulQA",
          "Human translation across six African languages",
        ],
      },
      {
        id: "translation",
        title: "Translation is part of the research",
        paragraphs: [
          "Technical benchmarks cannot be translated safely by replacing words one at a time. Scientific terminology, regional usage, answer choices, and culturally specific assumptions all need review in context.",
          "Uhura documents these difficulties and the mitigation work needed to make multilingual evaluation meaningful. The result is both a benchmark and a practical account of how to build better low-resource language datasets.",
        ],
      },
      {
        id: "findings",
        title: "What the results reveal",
        paragraphs: [
          "Across the evaluated systems, performance was consistently stronger in English than in the African languages. The study also found a significant gap between leading proprietary systems and the open models included in the evaluation.",
          "The central finding is straightforward: strong English performance does not guarantee safe, reliable behavior elsewhere. Multilingual capability needs to be tested directly and improved continuously before models are trusted in real-world settings.",
        ],
      },
      {
        id: "open-research",
        title: "Built to be extended",
        paragraphs: [
          "The paper, benchmark datasets, and evaluation platform were released openly to support further work in low-resource language NLP. Researchers can evaluate new models, examine individual languages, and build broader multilingual benchmarks from the same foundation.",
          "Uhura is a starting point rather than a finish line: a way to make language equity visible, testable, and actionable.",
        ],
      },
    ],
    sources: [],
  },
  {
    slug: "canopy",
    title: "Canopy",
    category: "Biodiversity intelligence",
    period: "XPRIZE Rainforest · 2019–2024",
    publishedAt: "2025-09-01",
    indexDate: "2025-09-01",
    indexDateLabel: "Sep",
    indexLabel: "New",
    summary:
      "A living interface for the autonomous systems helping people discover, understand, and preserve rainforest biodiversity.",
    challenge: "real-time understanding of living ecosystems.",
    pattern: "cmdk",
    hero: "rainforest",
    sections: [
      {
        id: "mission",
        title: "Making biodiversity legible",
        paragraphs: [
          "Rainforests hold immense biological knowledge, yet conventional field surveys can be slow, expensive, and difficult to repeat at the scale conservation requires. The XPRIZE Rainforest challenge asked teams to compress that work from months into hours.",
          "Canopy is grounded in the same ambition: connect autonomous field systems, biodiversity signals, and human expertise so changes in living ecosystems can be understood while there is still time to act.",
        ],
      },
      {
        id: "field-loop",
        title: "A faster field loop",
        paragraphs: [
          "The competition centered on technologies that could operate with minimal human intervention, rapidly survey tropical environments, and return useful biodiversity data in near real time.",
          "That creates a tighter loop between observation and conservation. Instead of treating a forest survey as a static report, Canopy imagines an evolving system in which new evidence continuously updates what communities and researchers know.",
        ],
        points: [
          "Deploy autonomous sensing systems",
          "Combine acoustic, visual, and genetic evidence",
          "Turn field observations into decision-ready data",
        ],
      },
      {
        id: "signals",
        title: "From signals to species",
        paragraphs: [
          "A rainforest does not arrive as a tidy dataset. It arrives as overlapping sound, imagery, environmental DNA, insect samples, weather, movement, and location. Useful intelligence comes from combining these partial signals without losing their provenance.",
          "The interface is designed around that plurality. The globe represents a distributed network of field sites and collaborators rather than a single centralized sensor.",
        ],
      },
      {
        id: "proof",
        title: "What the prize proved",
        paragraphs: [
          "The winning system used drone-deployed tools to capture bioacoustics, insect imagery, and environmental DNA. In a 24-hour final, it mapped 250 species and 700 unique taxa—evidence that rapid, technology-assisted biodiversity assessment can work in demanding field conditions.",
          "Across the competition, teams invested more than four million hours and filed 126 patents. The result was not one device, but a broader technical foundation for faster ecological discovery.",
        ],
      },
      {
        id: "stewardship",
        title: "Technology in service of stewardship",
        paragraphs: [
          "The objective is not observation for its own sake. Faster biodiversity intelligence can help conservationists establish baselines, identify change, direct limited resources, and support Indigenous communities stewarding the ecosystems they know most deeply.",
          "Canopy treats the map as a shared surface: a place where field evidence can become collective understanding and, ultimately, coordinated action.",
        ],
      },
    ],
    sources: [],
  },
] as const satisfies readonly ProjectPost[]

export type ProjectSlug = (typeof projects)[number]["slug"]

export function getProject(slug: string) {
  return projects.find((project) => project.slug === slug)
}
