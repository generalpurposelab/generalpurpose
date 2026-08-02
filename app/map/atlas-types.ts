export type AtlasDomain = "text" | "translation" | "speech" | "multimodal"

export interface AtlasResource {
  id: number
  name: string
  url: string
  paper: string | null
  year: number | null
  authors: string | null
  tasks: string[]
  domain: AtlasDomain
  kind: "benchmark" | "corpus" | "resource"
  tier: "primary" | "catalogue"
  description: string
  languagesClaimed: number
  languagesMatched: number
  unmatchedCodes: string[]
}

export interface CommonVoiceCoverage {
  locale: string
  totalHours: number
  validatedHours: number
  speakers: number
}

export interface AtlasLanguage {
  id: string
  name: string
  iso: string | null
  codes: string[]
  varieties: string[]
  macroarea: string
  latitude: number | null
  longitude: number | null
  countries: string[]
  family: string
  resources: number[]
  commonVoice: CommonVoiceCoverage | null
  documentedFrom: number | null
}

export interface AtlasLink {
  name: string
  url: string
  role?: string
  note?: string
}

export interface AtlasStats {
  languages: number
  geocoded: number
  withIso: number
  withAnyResource: number
  withText: number
  withTranslation: number
  withSpeech: number
  resourceCount: number
  commonVoiceLocales: number
  commonVoiceTotalHours: number
  commonVoiceValidatedHours: number
}

export interface AtlasData {
  schemaVersion: number
  generatedAt: string
  definition: string
  stats: AtlasStats
  sources: AtlasLink[]
  directories: AtlasLink[]
  resources: AtlasResource[]
  languages: AtlasLanguage[]
}

export type AtlasFilter = "all" | "text" | "translation" | "speech" | "gaps"
