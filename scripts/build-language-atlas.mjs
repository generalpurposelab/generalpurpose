import { mkdir, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"

const OUTPUT = resolve("public/data/language-atlas.json")

const URLS = {
  glottolog:
    "https://raw.githubusercontent.com/glottolog/glottolog-cldf/master/cldf/languages.csv",
  iso639:
    "https://iso639-3.sil.org/sites/iso639-3/files/downloads/iso-639-3.tab",
  catalogue:
    "https://raw.githubusercontent.com/generalpurposelab/uhuracrowd/main/data/benchmarks.json",
  flores:
    "https://raw.githubusercontent.com/facebookresearch/flores/main/flores200/README.md",
  belebele:
    "https://raw.githubusercontent.com/facebookresearch/belebele/main/README.md",
  fleurs: "https://huggingface.co/datasets/google/fleurs/raw/main/README.md",
  commonVoice:
    "https://raw.githubusercontent.com/common-voice/cv-dataset/main/datasets/scripted-speech/cv-corpus-26.0-2026-06-12.json",
}

const SOURCE_LINKS = [
  {
    name: "Glottolog CLDF",
    url: "https://github.com/glottolog/glottolog-cldf",
    role: "Language identity, family and representative geography",
  },
  {
    name: "FLORES-200",
    url: "https://github.com/facebookresearch/flores/tree/main/flores200",
    role: "Machine-translation evaluation coverage",
  },
  {
    name: "Belebele",
    url: "https://github.com/facebookresearch/belebele",
    role: "Reading-comprehension evaluation coverage",
  },
  {
    name: "Uhura",
    url: "https://arxiv.org/abs/2412.00948",
    role: "Scientific QA and truthfulness in six African languages",
  },
  {
    name: "FLEURS",
    url: "https://huggingface.co/datasets/google/fleurs",
    role: "ASR, speech language ID, translation and retrieval",
  },
  {
    name: "Common Voice v26",
    url: "https://github.com/common-voice/cv-dataset",
    role: "Scripted-speech hours and contributor metadata",
  },
  {
    name: "Uhura Crowd",
    url: "https://github.com/generalpurposelab/uhuracrowd",
    role: "Discovery catalogue for additional multilingual resources",
  },
]

const DIRECTORY_LINKS = [
  {
    name: "Low-resource languages directory",
    url: "https://github.com/RichardLitt/low-resource-languages",
    note: "Community-maintained discovery directory",
  },
  {
    name: "Masakhane",
    url: "https://www.masakhane.io/",
    note: "African NLP research community",
  },
  {
    name: "Lacuna Fund",
    url: "https://lacunafund.org/language/",
    note: "Funded language-data projects",
  },
  {
    name: "David Ifeoluwa Adelani",
    url: "https://arxiv.org/a/adelani_d_1.html",
    note: "Low-resource and African NLP publications",
  },
  {
    name: "Sara Hooker",
    url: "https://scholar.google.com/citations?user=2M8jvJMAAAAJ",
    note: "Multilingual and inclusive AI research",
  },
  {
    name: "Mozilla Common Voice",
    url: "https://commonvoice.mozilla.org/",
    note: "Community-led open speech collection",
  },
]

const REVIEWED_CODE_MAP = new Map(
  Object.entries({
    ara: "arb",
    aze: "azj",
    dut: "nld",
    est: "ekk",
    fas: "pes",
    fre: "fra",
    ger: "deu",
    grn: "gug",
    hrv: "hrv",
    mon: "khk",
    msa: "zsm",
    nep: "npi",
    nno: "nno",
    nob: "nob",
    ori: "ory",
    orm: "gaz",
    per: "pes",
    pus: "pbt",
    sqi: "als",
    srp: "srp",
    swa: "swh",
    twi: "twi",
    uzb: "uzn",
    yid: "ydd",
    zho: "cmn",
  })
)

const RESOURCE_DESCRIPTIONS = {
  "FLORES-200":
    "Parallel evaluation set for low-resource and multilingual machine translation.",
  Belebele:
    "Parallel multiple-choice reading-comprehension benchmark derived from FLORES passages.",
  Uhura:
    "Human-translated scientific question answering and truthfulness evaluation in six African languages.",
  AfriMMLU:
    "Multitask academic and professional knowledge evaluation for African languages.",
  "MasakhaNER 2.0":
    "Named-entity recognition benchmark created with African language communities.",
  "SIB-200":
    "Topic-classification benchmark spanning more than 200 language varieties.",
  XNLI: "Cross-lingual natural-language inference evaluation.",
  WikiANN:
    "Multilingual named-entity recognition corpus derived from Wikipedia.",
  MASSIVE: "Parallel intent-classification and slot-filling benchmark.",
  XLSUM: "Multilingual abstractive news-summarisation dataset.",
  GlotLID:
    "Language-identification model and evaluation resource for many languages.",
  mC4: "Multilingual web corpus used for language-model pretraining.",
  "OPUS-MT": "Open multilingual machine-translation models and corpora.",
  FLEURS:
    "Parallel speech benchmark for ASR, speech language identification, retrieval, and translation.",
  "Common Voice v26":
    "Community-created scripted-speech corpus with per-language hours and contributor metadata.",
}

async function fetchText(url) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`)
  }
  return response.text()
}

function parseCsv(text) {
  const rows = []
  let row = []
  let field = ""
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"'
        index += 1
      } else if (character === '"') {
        quoted = false
      } else {
        field += character
      }
    } else if (character === '"') {
      quoted = true
    } else if (character === ",") {
      row.push(field)
      field = ""
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""))
      rows.push(row)
      row = []
      field = ""
    } else {
      field += character
    }
  }

  if (field || row.length) {
    row.push(field)
    rows.push(row)
  }

  const headers = rows.shift()
  return rows
    .filter((values) => values.length === headers.length)
    .map((values) =>
      Object.fromEntries(
        headers.map((header, index) => [header, values[index]])
      )
    )
}

function parseIsoTable(text) {
  const [headerLine, ...lines] = text.trim().split(/\r?\n/)
  const headers = headerLine.split("\t")
  const aliases = new Map()
  for (const line of lines) {
    const values = line.split("\t")
    const row = Object.fromEntries(
      headers.map((header, index) => [header, values[index] ?? ""])
    )
    const id = row.Id.toLowerCase()
    for (const alias of [row.Id, row.Part1, row.Part2B, row.Part2T]) {
      if (alias) aliases.set(alias.toLowerCase(), id)
    }
  }
  return aliases
}

function parseFloresCodes(readme) {
  const codes = new Set()
  for (const line of readme.split(/\r?\n/)) {
    const match = line.match(/\|\s*([a-z]{3})_[A-Za-z0-9^]+\s*$/)
    if (match) codes.add(match[1])
  }
  return [...codes]
}

function parseBelebeleCodes(readme) {
  const codes = new Set()
  for (const line of readme.split(/\r?\n/)) {
    const match = line.match(/^([a-z]{3})_[A-Za-z0-9^]+\s*\|/)
    if (match) codes.add(match[1])
  }
  return [...codes]
}

function parseFleursCodes(readme) {
  const codes = new Set()
  for (const match of readme.matchAll(
    /^\s*- config_name:\s*([a-z]{2,3})_[A-Za-z0-9-]+/gm
  )) {
    codes.add(match[1].toLowerCase())
  }
  return [...codes]
}

function taskDomain(tasks) {
  const joined = tasks.join(" ").toLowerCase()
  if (joined.includes("speech") || joined.includes("asr")) return "speech"
  if (joined.includes("translation") || /(^|\s)mt($|\s)/.test(joined)) {
    return "translation"
  }
  if (joined.includes("multimodal")) return "multimodal"
  return "text"
}

function resourceKind(resource) {
  if (["mC4", "XLSUM"].includes(resource.name)) return "corpus"
  if (["OPUS-MT", "GlotLID"].includes(resource.name)) return "resource"
  return "benchmark"
}

function normalizeCode(rawCode, isoAliases, codeToLanguageId) {
  const base = rawCode.toLowerCase().split(/[-_]/)[0]
  let code = isoAliases.get(base) ?? base
  if (!code) return null
  code = REVIEWED_CODE_MAP.get(code) ?? code
  return codeToLanguageId.has(code) ? code : null
}

function cvCode(locale, isoAliases, codeToLanguageId) {
  if (locale === "zh-HK") return codeToLanguageId.has("yue") ? "yue" : null
  if (locale === "zh-CN" || locale === "zh-TW") {
    return codeToLanguageId.has("cmn") ? "cmn" : null
  }
  return normalizeCode(locale, isoAliases, codeToLanguageId)
}

function conciseHours(value) {
  return Math.round(value * 100) / 100
}

const [
  glottologText,
  isoText,
  catalogueText,
  floresReadme,
  belebeleReadme,
  fleursReadme,
  commonVoiceText,
] = await Promise.all([
  fetchText(URLS.glottolog),
  fetchText(URLS.iso639),
  fetchText(URLS.catalogue),
  fetchText(URLS.flores),
  fetchText(URLS.belebele),
  fetchText(URLS.fleurs),
  fetchText(URLS.commonVoice),
])

const glottologRows = parseCsv(glottologText)
const languageRows = glottologRows.filter((row) => row.Level === "language")
const rowNames = new Map(glottologRows.map((row) => [row.ID, row.Name]))
const isoAliases = parseIsoTable(isoText)
const codeToLanguageId = new Map()
for (const row of glottologRows) {
  if (!row.ISO639P3code) continue
  const targetId = row.Level === "language" ? row.ID : row.Language_ID
  if (targetId) codeToLanguageId.set(row.ISO639P3code, targetId)
}
const catalogue = JSON.parse(catalogueText)
const commonVoice = JSON.parse(commonVoiceText)

const corrections = new Map([
  [
    "FLORES-200",
    { languages: parseFloresCodes(floresReadme), tier: "primary" },
  ],
  [
    "Belebele",
    { languages: parseBelebeleCodes(belebeleReadme), tier: "primary" },
  ],
  [
    "XNLI",
    {
      languages: [
        "arb",
        "bul",
        "deu",
        "ell",
        "eng",
        "fra",
        "hin",
        "rus",
        "spa",
        "swh",
        "tha",
        "tur",
        "urd",
        "vie",
        "cmn",
      ],
      tier: "primary",
    },
  ],
  [
    "Uhura",
    {
      languages: ["amh", "hau", "nso", "swh", "yor", "zul"],
      tasks: ["Scientific QA", "Truthfulness"],
      url: "https://arxiv.org/abs/2412.00948",
      authors: "Bayes et al.",
      year: 2024,
      tier: "primary",
    },
  ],
])

const resourceDrafts = catalogue.map((resource) => {
  const correction = corrections.get(resource.name) ?? {}
  return {
    ...resource,
    ...correction,
    languages: correction.languages ?? resource.languages,
    tasks: correction.tasks ?? resource.tasks,
    tier: correction.tier ?? "catalogue",
  }
})

resourceDrafts.push(
  {
    name: "FLEURS",
    url: "https://huggingface.co/datasets/google/fleurs",
    year: 2022,
    authors: "Conneau et al. (Google)",
    authorUrl:
      "https://research.google/pubs/fleurs-few-shot-learning-evaluation-of-universal-representations-of-speech/",
    tasks: [
      "ASR",
      "Speech language ID",
      "Speech-text retrieval",
      "Translation",
    ],
    languages: parseFleursCodes(fleursReadme),
    tier: "primary",
    forcedDomain: "speech",
  },
  {
    name: "Common Voice v26",
    url: "https://github.com/common-voice/cv-dataset",
    year: 2026,
    authors: "Mozilla Foundation and language communities",
    authorUrl: "https://commonvoice.mozilla.org/",
    tasks: ["ASR", "Speech corpus"],
    languages: Object.keys(commonVoice.locales),
    tier: "primary",
    forcedDomain: "speech",
    forcedKind: "corpus",
  }
)

const resources = resourceDrafts.map((resource, id) => {
  const matchedCodes = new Set()
  const matchedLanguageIds = new Set()
  const unmatchedCodes = new Set()
  for (const rawCode of resource.languages) {
    const code =
      resource.name === "Common Voice v26"
        ? cvCode(rawCode, isoAliases, codeToLanguageId)
        : normalizeCode(rawCode, isoAliases, codeToLanguageId)
    if (code) {
      matchedCodes.add(code)
      matchedLanguageIds.add(codeToLanguageId.get(code))
    } else unmatchedCodes.add(rawCode)
  }

  return {
    id,
    name: resource.name,
    url: resource.url,
    paper: resource.authorUrl || null,
    year: resource.year || null,
    authors: resource.authors || null,
    tasks: resource.tasks,
    domain: resource.forcedDomain ?? taskDomain(resource.tasks),
    kind: resource.forcedKind ?? resourceKind(resource),
    tier: resource.tier,
    description:
      RESOURCE_DESCRIPTIONS[resource.name] ??
      `${resource.tasks.join(", ")} coverage catalogued by the linked project.`,
    languagesClaimed: new Set(resource.languages).size,
    languagesMatched: matchedLanguageIds.size,
    unmatchedCodes: [...unmatchedCodes].sort(),
    matchedCodes,
    matchedLanguageIds,
  }
})

const coverageByLanguageId = new Map()
for (const resource of resources) {
  for (const languageId of resource.matchedLanguageIds) {
    const coverage = coverageByLanguageId.get(languageId) ?? []
    coverage.push(resource.id)
    coverageByLanguageId.set(languageId, coverage)
  }
}

const cvByLanguageId = new Map()
for (const [locale, metadata] of Object.entries(commonVoice.locales)) {
  const iso = cvCode(locale, isoAliases, codeToLanguageId)
  const languageId = iso ? codeToLanguageId.get(iso) : null
  if (!languageId) continue
  const previous = cvByLanguageId.get(languageId)
  const next = {
    locale,
    totalHours: conciseHours(metadata.totalHrs ?? 0),
    validatedHours: conciseHours(metadata.validHrs ?? 0),
    speakers: metadata.users ?? 0,
  }
  if (!previous || next.validatedHours > previous.validatedHours) {
    cvByLanguageId.set(languageId, next)
  }
}

const codesByLanguageId = new Map()
const varietiesByLanguageId = new Map()
for (const row of glottologRows) {
  const targetId = row.Level === "language" ? row.ID : row.Language_ID
  if (!targetId) continue
  if (row.ISO639P3code) {
    const codes = codesByLanguageId.get(targetId) ?? new Set()
    codes.add(row.ISO639P3code)
    codesByLanguageId.set(targetId, codes)
  }
  if (row.Level === "dialect" && row.Name) {
    const varieties = varietiesByLanguageId.get(targetId) ?? []
    if (varieties.length < 24) varieties.push(row.Name)
    varietiesByLanguageId.set(targetId, varieties)
  }
}

const languages = languageRows
  .map((row) => {
    const codes = [...(codesByLanguageId.get(row.ID) ?? [])].sort()
    const iso = row.ISO639P3code || codes[0] || null
    const family =
      row.Is_Isolate === "true" ? "Isolate" : rowNames.get(row.Family_ID)
    return {
      id: row.Glottocode,
      name: row.Name,
      iso,
      codes,
      varieties: varietiesByLanguageId.get(row.ID) ?? [],
      macroarea: row.Macroarea || "Unclassified",
      latitude: row.Latitude ? Number(row.Latitude) : null,
      longitude: row.Longitude ? Number(row.Longitude) : null,
      countries: row.Countries ? row.Countries.split(";") : [],
      family: family || "Unclassified",
      resources: coverageByLanguageId.get(row.ID) ?? [],
      commonVoice: cvByLanguageId.get(row.ID) ?? null,
      documentedFrom: row.First_Year_Of_Documentation
        ? Number(row.First_Year_Of_Documentation)
        : null,
    }
  })
  .sort((a, b) => a.name.localeCompare(b.name))

const publicResources = resources.map(
  ({ matchedCodes, matchedLanguageIds, ...resource }) => {
    void matchedCodes
    void matchedLanguageIds
    return resource
  }
)
const hasDomain = (language, domain) =>
  language.resources.some((id) => publicResources[id].domain === domain)

const stats = {
  languages: languages.length,
  geocoded: languages.filter(
    (language) => language.latitude !== null && language.longitude !== null
  ).length,
  withIso: languages.filter((language) => language.iso).length,
  withAnyResource: languages.filter((language) => language.resources.length)
    .length,
  withText: languages.filter((language) => hasDomain(language, "text")).length,
  withTranslation: languages.filter((language) =>
    hasDomain(language, "translation")
  ).length,
  withSpeech: languages.filter((language) => hasDomain(language, "speech"))
    .length,
  resourceCount: publicResources.length,
  commonVoiceLocales: Object.keys(commonVoice.locales).length,
  commonVoiceTotalHours: commonVoice.totalHrs,
  commonVoiceValidatedHours: commonVoice.totalValidHrs,
}

const output = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  definition:
    "A complete Glottolog language inventory with observed technology-resource coverage. Missing coverage means not observed in the indexed sources, not proof of absence.",
  stats,
  sources: SOURCE_LINKS,
  directories: DIRECTORY_LINKS,
  resources: publicResources,
  languages,
}

await mkdir(dirname(OUTPUT), { recursive: true })
await writeFile(OUTPUT, `${JSON.stringify(output)}\n`)

console.log(`Wrote ${OUTPUT}`)
console.log(JSON.stringify(stats, null, 2))
for (const resource of publicResources) {
  if (resource.unmatchedCodes.length) {
    console.log(
      `${resource.name}: ${resource.languagesMatched}/${resource.languagesClaimed} codes matched; unmatched ${resource.unmatchedCodes.join(", ")}`
    )
  }
}
