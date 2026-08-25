"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"

import { ThemeToggle } from "@/components/theme-toggle"

import type {
  AtlasData,
  AtlasDomain,
  AtlasFilter,
  AtlasLanguage,
  AtlasResource,
} from "./atlas-types"
import styles from "./map.module.css"

const LanguageGlobe = dynamic(
  () => import("./language-globe").then((module) => module.LanguageGlobe),
  { loading: () => null }
)

const FILTERS: { id: AtlasFilter; label: string }[] = [
  { id: "all", label: "All languages" },
  { id: "text", label: "Text / LLM" },
  { id: "translation", label: "Translation" },
  { id: "speech", label: "Voice" },
  { id: "gaps", label: "No indexed coverage" },
]

const TABLE_BATCH_SIZE = 100

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 17 17 7M8 7h9v9" />
    </svg>
  )
}

function normalize(value: string) {
  return value
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value)
}

function formatHours(value: number) {
  if (value >= 1000)
    return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value / 1000)}k`
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(
    value
  )
}

function formatList(values: string[]) {
  return new Intl.ListFormat("en-US", {
    style: "long",
    type: "conjunction",
  }).format(values)
}

function formatCountry(code: string) {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code
  } catch {
    return code
  }
}

function countrySummary(codes: string[]) {
  const names = codes.map(formatCountry)
  if (names.length <= 2) return formatList(names)
  return `${names.slice(0, 2).join(" · ")} +${names.length - 2}`
}

function domainsFor(language: AtlasLanguage, resources: AtlasResource[]) {
  return new Set(
    language.resources
      .map((resourceId) => resources[resourceId]?.domain)
      .filter(Boolean)
  )
}

function DomainDot({ domain }: { domain: AtlasDomain | "gap" }) {
  return (
    <span
      className={styles.domainDot}
      data-domain={domain}
      aria-hidden="true"
    />
  )
}

function DomainLabel({ domain }: { domain: AtlasDomain }) {
  const labels: Record<AtlasDomain, string> = {
    text: "Text / LLM",
    translation: "Translation",
    speech: "Voice",
    multimodal: "Multimodal",
  }
  return (
    <span className={styles.domainLabel}>
      <DomainDot domain={domain} />
      {labels[domain]}
    </span>
  )
}

function TelemetryPanel({
  data,
  language,
}: {
  data: AtlasData
  language: AtlasLanguage | null
}) {
  const glottologUrl = language
    ? `https://glottolog.org/resource/languoid/id/${language.id}`
    : null
  const countryNames = language?.countries.map(formatCountry) ?? []
  const evaluationCount = (domain: AtlasDomain) =>
    language
      ? language.resources.filter(
          (resourceId) => data.resources[resourceId]?.domain === domain
        ).length
      : 0

  const evaluationLabel = (count: number) =>
    count === 0 ? "No eval" : `${count} eval${count === 1 ? "" : "s"}`

  const evaluationDomains: Array<{
    domain: AtlasDomain
    label: string
  }> = [
    { domain: "text", label: "Text" },
    { domain: "translation", label: "Translation" },
    { domain: "speech", label: "Voice" },
  ]

  return (
    <aside className={styles.telemetry} aria-label="Glottomap telemetry">
      <div className={styles.telemetryTitle}>Glottomap · coverage</div>
      <dl className={styles.telemetryList}>
        <div>
          <dt>Selection</dt>
          <dd>{language?.name ?? "—"}</dd>
        </div>
        <div>
          <dt>Spoken in</dt>
          <dd>
            {language && language.countries.length && glottologUrl ? (
              <a
                href={glottologUrl}
                target="_blank"
                rel="noreferrer"
                title={formatList(countryNames)}
              >
                {countrySummary(language.countries)}
              </a>
            ) : (
              "Not available"
            )}
          </dd>
        </div>
        <div>
          <dt>Speakers</dt>
          <dd>
            {language?.speakerEstimate ? (
              <a
                href={language.speakerEstimate.url}
                target="_blank"
                rel="noreferrer"
                title={`${language.speakerEstimate.source} speaker estimate${
                  language.speakerEstimate.kind
                    ? ` (${language.speakerEstimate.kind})`
                    : ""
                }`}
              >
                {language.speakerEstimate.text}
                {language.speakerEstimate.kind
                  ? ` · ${language.speakerEstimate.kind}`
                  : ""}
                {language.speakerEstimate.year
                  ? ` · ${language.speakerEstimate.year}`
                  : ""}
              </a>
            ) : (
              "Not available"
            )}
          </dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>
            {language?.status && glottologUrl ? (
              <a
                href={glottologUrl}
                target="_blank"
                rel="noreferrer"
                title="Glottolog aggregated endangerment status"
              >
                {language.status}
              </a>
            ) : (
              "Not available"
            )}
          </dd>
        </div>
        <div>
          <dt>Family</dt>
          <dd>{language?.family ?? "—"}</dd>
        </div>
        {evaluationDomains.map(({ domain, label }) => {
          const count = evaluationCount(domain)

          return (
            <div key={domain}>
              <dt>{label}</dt>
              <dd>{evaluationLabel(count)}</dd>
            </div>
          )
        })}
      </dl>
    </aside>
  )
}

function StoryCard({
  data,
  exploreOpen,
  language,
  onExplore,
  onOpenDetails,
  onReset,
}: {
  data: AtlasData
  exploreOpen: boolean
  language: AtlasLanguage | null
  onExplore: () => void
  onOpenDetails: () => void
  onReset: () => void
}) {
  return (
    <section
      className={styles.storyCard}
      data-selected={Boolean(language)}
      aria-label="Glottomap guide"
    >
      <div className={styles.storyHeading}>
        <span>{language ? language.name : "Welcome to Glottomap"}</span>
        {language ? <span>{language.iso ?? language.id}</span> : null}
      </div>
      <div className={styles.storyBody}>
        {language ? (
          <LanguageCardParagraph
            language={language}
            resources={data.resources}
          />
        ) : (
          <>
            LLMs are often tested in English and a small group of other
            languages. Glottomap shows which languages don&apos;t appear in the
            datasets and tests we track. It tracks{" "}
            {formatNumber(data.stats.languages)} languages. Many are
            low-resource, with less data and technology support than widely used
            languages.
          </>
        )}
      </div>
      <div className={styles.storyActions}>
        {!language ? (
          <span className={styles.storyPrompt}>
            Select a language on the globe
          </span>
        ) : null}
        <div>
          {language ? (
            <>
              <button type="button" onClick={onOpenDetails}>
                Details
              </button>
              <button type="button" onClick={onReset}>
                Reset
              </button>
            </>
          ) : (
            <button type="button" data-explore-toggle onClick={onExplore}>
              {exploreOpen ? "Close" : "Explore"}
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

function CoverageMarks({
  language,
  resources,
  withLabels = false,
}: {
  language: AtlasLanguage
  resources: AtlasResource[]
  withLabels?: boolean
}) {
  const domains = domainsFor(language, resources)
  const coverage: { domain: AtlasDomain; label: string }[] = [
    { domain: "text", label: "Text" },
    { domain: "translation", label: "Translation" },
    { domain: "speech", label: "Voice" },
  ]
  return (
    <span className={styles.coverageMarks}>
      {coverage.map(({ domain, label }) => (
        <span
          className={styles.coverageMark}
          data-active={domains.has(domain)}
          data-domain={domain}
          key={domain}
          title={`${label}: ${domains.has(domain) ? "linked evidence found" : "not found in this index"}`}
        >
          <DomainDot domain={domain} />
          {withLabels ? label : null}
        </span>
      ))}
    </span>
  )
}

function LanguageCardParagraph({
  language,
  resources,
}: {
  language: AtlasLanguage
  resources: AtlasResource[]
}) {
  const evaluations = [
    { domain: "text" as const, label: "text" },
    { domain: "translation" as const, label: "translation" },
    { domain: "speech" as const, label: "voice" },
  ]
    .map(({ domain, label }) => {
      const sources = language.resources
        .map((resourceId) => resources[resourceId])
        .filter((resource) => resource?.domain === domain)

      return { count: sources.length, label, sources }
    })
    .filter(({ count }) => count > 0)
  const evaluationCount = evaluations.reduce(
    (total, evaluation) => total + evaluation.count,
    0
  )
  const countryNames = language.countries.map(formatCountry)
  const spokenPlaces =
    countryNames.length > 6
      ? [
          ...countryNames.slice(0, 5),
          `${countryNames.length - 5} other countries`,
        ]
      : countryNames
  const representativeSources: AtlasResource[] = []

  for (const evaluation of evaluations) {
    const source = evaluation.sources[0]
    if (source) representativeSources.push(source)
  }

  for (const evaluation of evaluations) {
    for (const source of evaluation.sources) {
      if (representativeSources.length === 3) break
      if (!representativeSources.some((item) => item.id === source.id)) {
        representativeSources.push(source)
      }
    }
  }

  let evaluationSentence = "There are no evals tracked yet."
  if (evaluationCount === 1) {
    evaluationSentence = `There is one ${evaluations[0].label} eval tracked.`
  } else if (evaluations.length === 1) {
    evaluationSentence = `There are ${formatNumber(evaluationCount)} ${evaluations[0].label} evals tracked.`
  } else if (evaluationCount > 1) {
    evaluationSentence = `There are ${formatNumber(evaluationCount)} evals tracked: ${formatList(
      evaluations.map(
        ({ count, label }) => `${formatNumber(count)} for ${label}`
      )
    )}.`
  }

  return (
    <p>
      {language.name} is spoken in{" "}
      {spokenPlaces.length ? formatList(spokenPlaces) : language.macroarea}. Its
      language family is {language.family}. {evaluationSentence}
      {representativeSources.length ? (
        <>
          {" "}
          {evaluationCount === 1
            ? "The source is "
            : representativeSources.length === evaluationCount
              ? "The sources are "
              : "Sources include "}
          {representativeSources.map((source, index) => (
            <span key={source.id}>
              {index === 0
                ? null
                : index === representativeSources.length - 1
                  ? representativeSources.length === 2
                    ? " and "
                    : ", and "
                  : ", "}
              <a
                className={styles.storySourceLink}
                href={source.url}
                target="_blank"
                rel="noreferrer"
              >
                {source.name}
              </a>
            </span>
          ))}
          .
        </>
      ) : null}
    </p>
  )
}

function ExternalLink({
  children,
  className,
  href,
}: {
  children: ReactNode
  className?: string
  href: string
}) {
  return (
    <a className={className} href={href} target="_blank" rel="noreferrer">
      {children}
      <ArrowIcon />
    </a>
  )
}

function ResourceCard({ resource }: { resource: AtlasResource }) {
  return (
    <article className={styles.resourceCard}>
      <div className={styles.resourceCardTopline}>
        <DomainLabel domain={resource.domain} />
        {resource.year ? <span>{resource.year}</span> : null}
      </div>
      <h4>{resource.name}</h4>
      <p>{resource.description}</p>
      <div className={styles.taskList}>
        {resource.tasks.map((task) => (
          <span key={task}>{task}</span>
        ))}
      </div>
      <div className={styles.resourceCardFooter}>
        <span>
          {formatNumber(resource.languagesMatched)} mapped language
          {resource.languagesMatched === 1 ? "" : "s"}
        </span>
        <ExternalLink href={resource.url}>Open source</ExternalLink>
      </div>
    </article>
  )
}

function LanguageDetail({
  language,
  resources,
  onClose,
}: {
  language: AtlasLanguage
  resources: AtlasResource[]
  onClose: () => void
}) {
  const linkedResources = language.resources
    .map((id) => resources[id])
    .filter(Boolean)
    .sort(
      (a, b) => a.domain.localeCompare(b.domain) || a.name.localeCompare(b.name)
    )
  const glottologUrl = `https://glottolog.org/resource/languoid/id/${language.id}`

  return (
    <aside
      className={styles.detailPanel}
      aria-label={`${language.name} details`}
    >
      <button
        className={styles.iconButton}
        type="button"
        onClick={onClose}
        aria-label="Close language details"
      >
        <CloseIcon />
      </button>
      <div className={styles.detailEyebrow}>{language.macroarea}</div>
      <h2>{language.name}</h2>
      {language.varieties.length ? (
        <p className={styles.varieties}>
          Includes catalogued varieties such as{" "}
          {language.varieties.slice(0, 4).join(", ")}
          {language.varieties.length > 4 ? ", and others" : ""}.
        </p>
      ) : null}

      <dl className={styles.languageFacts}>
        <div>
          <dt>Glottocode</dt>
          <dd>{language.id}</dd>
        </div>
        <div>
          <dt>ISO 639-3</dt>
          <dd>
            {language.codes.length
              ? language.codes.join(" · ")
              : "Not assigned"}
          </dd>
        </div>
        <div>
          <dt>Family</dt>
          <dd>{language.family}</dd>
        </div>
        <div>
          <dt>Countries</dt>
          <dd>
            {language.countries.length
              ? language.countries.join(" · ")
              : "Not catalogued"}
          </dd>
        </div>
      </dl>

      <div className={styles.detailCoverage}>
        <span className={styles.sectionLabel}>Observed coverage</span>
        <CoverageMarks language={language} resources={resources} withLabels />
      </div>

      {language.commonVoice ? (
        <section className={styles.voiceCard}>
          <div>
            <span>Common Voice v26</span>
            <strong>
              {formatHours(language.commonVoice.validatedHours)} validated hours
            </strong>
          </div>
          <dl>
            <div>
              <dt>Total hours</dt>
              <dd>{formatHours(language.commonVoice.totalHours)}</dd>
            </div>
            <div>
              <dt>Contributors</dt>
              <dd>{formatNumber(language.commonVoice.speakers)}</dd>
            </div>
            <div>
              <dt>Locale</dt>
              <dd>{language.commonVoice.locale}</dd>
            </div>
          </dl>
          <ExternalLink href="https://commonvoice.mozilla.org/">
            Explore Common Voice
          </ExternalLink>
        </section>
      ) : null}

      <div className={styles.detailResources}>
        <div className={styles.detailSectionHeading}>
          <span className={styles.sectionLabel}>Evaluations & resources</span>
          <span>{linkedResources.length}</span>
        </div>
        {linkedResources.length ? (
          linkedResources.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} />
          ))
        ) : (
          <div className={styles.emptyCoverage}>
            <DomainDot domain="gap" />
            <div>
              <strong>No linked evidence found</strong>
              <p>
                This snapshot does not include a linked resource for this
                language. That does not mean none exists.
              </p>
            </div>
          </div>
        )}
      </div>

      <ExternalLink className={styles.glottologLink} href={glottologUrl}>
        View the Glottolog record
      </ExternalLink>
    </aside>
  )
}

function AtlasDrawer({
  data,
  mode,
  onClose,
}: {
  data: AtlasData
  mode: "methodology" | "resources"
  onClose: () => void
}) {
  return (
    <aside
      className={styles.drawer}
      aria-label={
        mode === "methodology" ? "Glottomap methodology" : "Resource index"
      }
    >
      <button
        className={styles.iconButton}
        type="button"
        onClick={onClose}
        aria-label="Close panel"
      >
        <CloseIcon />
      </button>
      {mode === "methodology" ? (
        <>
          <div className={styles.detailEyebrow}>Methods & provenance</div>
          <section className={styles.methodBlock}>
            <span className={styles.sectionLabel}>What a point means</span>
            <p>
              Each row represents a language-level Glottolog entry. A point
              marks one representative coordinate—not a border or the full area
              where people speak the language. Variants and scripts are grouped
              only to help navigate the atlas.
            </p>
          </section>

          <section className={styles.methodBlock}>
            <span className={styles.sectionLabel}>Primary sources</span>
            <div className={styles.linkList}>
              {data.sources.map((source) => (
                <ExternalLink href={source.url} key={source.name}>
                  <span>
                    <strong>{source.name}</strong>
                    <small>{source.role}</small>
                  </span>
                </ExternalLink>
              ))}
            </div>
          </section>

          <section className={styles.methodBlock}>
            <span className={styles.sectionLabel}>Research directories</span>
            <div className={styles.linkList}>
              {data.directories.map((directory) => (
                <ExternalLink href={directory.url} key={directory.name}>
                  <span>
                    <strong>{directory.name}</strong>
                    <small>{directory.note}</small>
                  </span>
                </ExternalLink>
              ))}
            </div>
          </section>

          <p className={styles.generatedAt}>
            Snapshot generated{" "}
            {new Date(data.generatedAt).toLocaleDateString("en-US", {
              dateStyle: "long",
            })}
            . Missing coverage means “not observed in these sources.”
          </p>
        </>
      ) : (
        <>
          <div className={styles.detailEyebrow}>Resource index</div>
          <h2>{data.resources.length} linked datasets and evaluations</h2>
          <p className={styles.drawerIntro}>
            Browse every indexed project. “Mapped” counts use conservative
            matches to the Glottolog language inventory.
          </p>
          <div className={styles.resourceIndex}>
            {data.resources.map((resource) => (
              <ResourceCard key={resource.id} resource={resource} />
            ))}
          </div>
        </>
      )}
    </aside>
  )
}

export function LanguageAtlas() {
  const [data, setData] = useState<AtlasData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<"map" | "table">("map")
  const [exploreOpen, setExploreOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [submitOpen, setSubmitOpen] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [submitLanguageQuery, setSubmitLanguageQuery] = useState("")
  const [submitLanguageId, setSubmitLanguageId] = useState<string | null>(null)
  const [submitLanguageFocused, setSubmitLanguageFocused] = useState(false)
  const [filter, setFilter] = useState<AtlasFilter>("all")
  const [macroarea, setMacroarea] = useState("all")
  const [query, setQuery] = useState("")
  const [searchFocused, setSearchFocused] = useState(false)
  const [selectedLanguage, setSelectedLanguage] =
    useState<AtlasLanguage | null>(null)
  const [globeResetVersion, setGlobeResetVersion] = useState(0)
  const [drawer, setDrawer] = useState<"methodology" | "resources" | null>(null)
  const [visibleTableRows, setVisibleTableRows] = useState(TABLE_BATCH_SIZE)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const explorePanelRef = useRef<HTMLElement>(null)
  const tableLoadMoreRef = useRef<HTMLDivElement>(null)
  const submitButtonRef = useRef<HTMLButtonElement>(null)
  const submitCloseRef = useRef<HTMLButtonElement>(null)
  const submitLanguageInputRef = useRef<HTMLInputElement>(null)
  const submitSuccessRef = useRef<HTMLHeadingElement>(null)
  const submitWasOpenRef = useRef(false)
  const deferredQuery = useDeferredValue(query)

  useEffect(() => {
    const controller = new AbortController()
    void fetch("/data/language-atlas.json", { signal: controller.signal })
      .then((response) => {
        if (!response.ok)
          throw new Error(`Glottomap data returned ${response.status}`)
        return response.json() as Promise<AtlasData>
      })
      .then(setData)
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError")
          return
        setError(
          reason instanceof Error ? reason.message : "Unable to load Glottomap"
        )
      })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (exploreOpen) searchInputRef.current?.focus()
  }, [exploreOpen])

  useEffect(() => {
    if (!exploreOpen) return
    const handleClick = (event: globalThis.MouseEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (explorePanelRef.current?.contains(target)) return
      if (
        target instanceof Element &&
        target.closest("[data-explore-toggle]")
      ) {
        return
      }
      setExploreOpen(false)
    }
    document.addEventListener("click", handleClick)
    return () => document.removeEventListener("click", handleClick)
  }, [exploreOpen])

  useEffect(() => {
    if (submitOpen) {
      submitWasOpenRef.current = true
      if (submitSuccess) submitSuccessRef.current?.focus()
      else submitLanguageInputRef.current?.focus()
    } else if (submitWasOpenRef.current) {
      submitWasOpenRef.current = false
      submitButtonRef.current?.focus()
      setSubmitSuccess(false)
      setSubmitLanguageQuery("")
      setSubmitLanguageId(null)
      setSubmitLanguageFocused(false)
    }
  }, [submitOpen, submitSuccess])

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "/" && !(event.target instanceof HTMLInputElement)) {
        event.preventDefault()
        setExploreOpen(true)
        return
      }
      if (event.key === "Escape") {
        if (submitOpen) setSubmitOpen(false)
        else if (drawer) setDrawer(null)
        else if (detailOpen) setDetailOpen(false)
        else if (exploreOpen) setExploreOpen(false)
        else if (selectedLanguage) setSelectedLanguage(null)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [detailOpen, drawer, exploreOpen, selectedLanguage, submitOpen])

  const macroareas = useMemo(
    () =>
      data
        ? [
            ...new Set(data.languages.map((language) => language.macroarea)),
          ].sort()
        : [],
    [data]
  )

  const submitLanguageMatches = useMemo(() => {
    if (!data || !submitLanguageFocused || submitLanguageId) return []
    const search = normalize(submitLanguageQuery.trim())
    if (!search) return []
    return data.languages
      .filter((language) =>
        normalize(
          [language.name, language.iso, language.id].filter(Boolean).join(" ")
        ).includes(search)
      )
      .slice(0, 6)
  }, [data, submitLanguageFocused, submitLanguageId, submitLanguageQuery])

  const filteredLanguages = useMemo(() => {
    if (!data) return []
    const search = normalize(deferredQuery.trim())
    return data.languages.filter((language) => {
      if (macroarea !== "all" && language.macroarea !== macroarea) return false
      const domains = domainsFor(language, data.resources)
      if (filter === "gaps" && language.resources.length) return false
      if (filter !== "all" && filter !== "gaps" && !domains.has(filter))
        return false
      if (!search) return true
      const haystack = normalize(
        [
          language.name,
          language.id,
          language.iso,
          language.family,
          language.macroarea,
          ...language.codes,
          ...language.varieties,
        ]
          .filter(Boolean)
          .join(" ")
      )
      return haystack.includes(search)
    })
  }, [data, deferredQuery, filter, macroarea])

  useEffect(() => {
    const trigger = tableLoadMoreRef.current
    if (
      view !== "table" ||
      !trigger ||
      visibleTableRows >= filteredLanguages.length
    ) {
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setVisibleTableRows((current) =>
          Math.min(current + TABLE_BATCH_SIZE, filteredLanguages.length)
        )
      },
      { rootMargin: "500px 0px" }
    )
    observer.observe(trigger)
    return () => observer.disconnect()
  }, [filteredLanguages.length, view, visibleTableRows])

  const selectLanguage = (language: AtlasLanguage | null) => {
    setSelectedLanguage(language)
    setDetailOpen(false)
    if (language) {
      setExploreOpen(false)
    } else if (query.trim() || filter !== "all" || macroarea !== "all") {
      setFilter("all")
      setMacroarea("all")
      setQuery("")
      setSearchFocused(false)
      setVisibleTableRows(TABLE_BATCH_SIZE)
    }
  }

  const resetGuide = () => {
    setSelectedLanguage(null)
    setDetailOpen(false)
    setFilter("all")
    setMacroarea("all")
    setQuery("")
    setVisibleTableRows(TABLE_BATCH_SIZE)
    setGlobeResetVersion((current) => current + 1)
  }

  if (error) {
    return (
      <main className={styles.errorState}>
        <span>Glottomap</span>
        <h1>Glottomap couldn&apos;t load.</h1>
        <p>We couldn&apos;t load the language index. Try again.</p>
        <button type="button" onClick={() => window.location.reload()}>
          Try again
        </button>
      </main>
    )
  }

  if (!data) {
    return (
      <main className={styles.loadingState} aria-busy="true">
        <div className={styles.loadingMark} aria-hidden="true" />
        <span>Loading the language atlas…</span>
      </main>
    )
  }

  const visibleRows = filteredLanguages.slice(0, visibleTableRows)
  const searchResults = query.trim() ? filteredLanguages.slice(0, 7) : []
  const mapLanguages = filteredLanguages

  return (
    <main
      className={styles.atlas}
      data-engaged={Boolean(selectedLanguage)}
      data-explore={exploreOpen}
      data-view={view}
    >
      <h1 className={styles.srOnly}>Glottomap</h1>
      {selectedLanguage ? (
        <TelemetryPanel data={data} language={selectedLanguage} />
      ) : (
        <Link
          href="/"
          className={styles.brandWordmark}
          aria-label="General Purpose home"
        />
      )}

      <header className={styles.instrumentHeader}>
        <div className={styles.instrumentActions}>
          <button
            ref={submitButtonRef}
            className={styles.submitToggle}
            type="button"
            aria-haspopup="dialog"
            aria-expanded={submitOpen}
            onClick={() => setSubmitOpen(true)}
          >
            Submit data
          </button>
          <div className={styles.viewToggle} aria-label="Glottomap view">
            <button
              type="button"
              onClick={() =>
                setView((current) => (current === "map" ? "table" : "map"))
              }
            >
              {view === "map" ? "Show table" : "Show globe"}
            </button>
          </div>
          <ThemeToggle className={styles.themeToggle} />
        </div>
      </header>

      {exploreOpen ? (
        <section
          ref={explorePanelRef}
          className={styles.explorePanel}
          aria-label="Explore Glottomap"
        >
          <div className={styles.exploreHeading}>
            <span>Explore the inventory</span>
            <span>{formatNumber(filteredLanguages.length)} results</span>
          </div>
          <div
            className={styles.controls}
            role="region"
            aria-label="Language filters"
          >
            <label className={styles.macroareaSelect}>
              <span className={styles.srOnly}>Macroarea</span>
              <select
                value={macroarea}
                onChange={(event) => {
                  setMacroarea(event.target.value)
                  setVisibleTableRows(TABLE_BATCH_SIZE)
                }}
              >
                <option value="all">All regions</option>
                {macroareas.map((area) => (
                  <option key={area}>{area}</option>
                ))}
              </select>
            </label>

            <div
              className={styles.searchWrap}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                  setSearchFocused(false)
                }
              }}
            >
              <SearchIcon />
              <input
                ref={searchInputRef}
                aria-label="Search languages"
                placeholder="Search name, ISO, family, or Glottocode…"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setVisibleTableRows(TABLE_BATCH_SIZE)
                }}
                onFocus={() => setSearchFocused(true)}
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("")
                    setVisibleTableRows(TABLE_BATCH_SIZE)
                  }}
                  aria-label="Clear search"
                >
                  <CloseIcon />
                </button>
              ) : null}
              {searchFocused && query.trim() ? (
                <div className={styles.searchResults}>
                  {searchResults.length ? (
                    searchResults.map((language) => (
                      <button
                        type="button"
                        key={language.id}
                        onMouseDown={(event) => event.preventDefault()}
                        onPointerDown={(event) => event.preventDefault()}
                        onClick={() => {
                          selectLanguage(language)
                          setSearchFocused(false)
                          setView("map")
                          setExploreOpen(false)
                        }}
                      >
                        <span>
                          <strong>{language.name}</strong>
                          <small>
                            {language.family} · {language.macroarea}
                          </small>
                        </span>
                        <code>{language.iso ?? language.id}</code>
                      </button>
                    ))
                  ) : (
                    <p>No languages match your search.</p>
                  )}
                </div>
              ) : null}
            </div>

            <div className={styles.filterRow}>
              {FILTERS.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  data-filter={item.id}
                  data-active={filter === item.id}
                  onClick={() => {
                    setFilter(item.id)
                    setVisibleTableRows(TABLE_BATCH_SIZE)
                  }}
                >
                  {item.id !== "all" ? (
                    <DomainDot domain={item.id === "gaps" ? "gap" : item.id} />
                  ) : null}
                  {item.label}
                </button>
              ))}
            </div>
            <div className={styles.exploreLinks}>
              <button type="button" onClick={() => setDrawer("resources")}>
                Resource index
              </button>
              <button type="button" onClick={() => setDrawer("methodology")}>
                Methodology
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <section
        className={styles.mapStage}
        hidden={view !== "map"}
        onPointerDown={(event) => {
          if (event.target !== event.currentTarget) return
          selectLanguage(null)
        }}
      >
        <LanguageGlobe
          languages={mapLanguages}
          resources={data.resources}
          resetVersion={globeResetVersion}
          selectedLanguage={selectedLanguage}
          onSelect={selectLanguage}
        />

        {/* Map key intentionally hidden from the default view.
        {!selectedLanguage ? (
          <div className={styles.legend}>
            <span>
              <DomainDot domain="text" /> Text / LLM
            </span>
            <span>
              <DomainDot domain="translation" /> Translation
            </span>
            <span>
              <DomainDot domain="speech" /> Voice
            </span>
            <span>
              <DomainDot domain="gap" /> No indexed coverage
            </span>
          </div>
        ) : null} */}

        <StoryCard
          data={data}
          exploreOpen={exploreOpen}
          language={selectedLanguage}
          onExplore={() => setExploreOpen((current) => !current)}
          onOpenDetails={() => setDetailOpen(true)}
          onReset={resetGuide}
        />
      </section>

      <section className={styles.tableStage} hidden={view !== "table"}>
        <div className={styles.tableIntro}>
          <div>
            <span className={styles.sectionLabel}>Language inventory</span>
            <h1>{formatNumber(filteredLanguages.length)} languages</h1>
            <label className={styles.tableSearch}>
              <span className={styles.srOnly}>Search language inventory</span>
              <SearchIcon />
              <input
                type="search"
                placeholder="Search name, ISO, family, or Glottocode…"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setVisibleTableRows(TABLE_BATCH_SIZE)
                }}
              />
            </label>
          </div>
          <p>
            Browse every language-level Glottolog entry. Coverage reflects
            evidence found in linked sources—not a judgment of a language&apos;s
            resources or readiness.
          </p>
        </div>

        <div className={styles.tableScroll}>
          <table>
            <thead>
              <tr>
                <th>Language</th>
                <th>ISO</th>
                <th>Macroarea</th>
                <th>Family</th>
                <th>Coverage</th>
                <th>Evals</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((language) => (
                <tr key={language.id}>
                  <td>
                    <button
                      type="button"
                      onClick={() => {
                        selectLanguage(language)
                        setDetailOpen(true)
                      }}
                    >
                      <strong>{language.name}</strong>
                      {language.varieties[0] ? (
                        <small>{language.varieties[0]}</small>
                      ) : null}
                    </button>
                  </td>
                  <td>
                    <code>{language.iso ?? "—"}</code>
                  </td>
                  <td>{language.macroarea}</td>
                  <td>{language.family}</td>
                  <td>
                    <CoverageMarks
                      language={language}
                      resources={data.resources}
                    />
                  </td>
                  <td>
                    <span className={styles.resourceCount}>
                      {language.resources.length}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!visibleRows.length ? (
            <div className={styles.noResults}>
              <strong>No languages match these filters</strong>
              <button
                type="button"
                onClick={() => {
                  setQuery("")
                  setFilter("all")
                  setMacroarea("all")
                  setVisibleTableRows(TABLE_BATCH_SIZE)
                }}
              >
                Reset filters
              </button>
            </div>
          ) : null}
          {visibleRows.length < filteredLanguages.length ? (
            <div
              ref={tableLoadMoreRef}
              className={styles.tableLoadMore}
              aria-hidden="true"
            />
          ) : null}
        </div>
      </section>

      {selectedLanguage && detailOpen ? (
        <>
          <button
            className={styles.panelScrim}
            type="button"
            onClick={() => setDetailOpen(false)}
            aria-label="Close language details"
          />
          <LanguageDetail
            language={selectedLanguage}
            resources={data.resources}
            onClose={() => setDetailOpen(false)}
          />
        </>
      ) : null}

      {drawer ? (
        <>
          <button
            className={styles.drawerScrim}
            type="button"
            onClick={() => setDrawer(null)}
            aria-label="Close information panel"
          />
          <AtlasDrawer
            data={data}
            mode={drawer}
            onClose={() => setDrawer(null)}
          />
        </>
      ) : null}

      {submitOpen ? (
        <>
          <button
            className={styles.submitModalScrim}
            type="button"
            onClick={() => setSubmitOpen(false)}
            aria-label="Close submit data modal"
          />
          <section
            className={styles.submitModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="submit-data-title"
          >
            <header>
              <h2 id="submit-data-title">Submit data</h2>
              <button
                ref={submitCloseRef}
                className={styles.submitModalClose}
                type="button"
                onClick={() => setSubmitOpen(false)}
                aria-label="Close submit data modal"
              >
                <CloseIcon />
              </button>
            </header>
            {submitSuccess ? (
              <div className={styles.submitSuccess} aria-live="polite">
                <div className={styles.submitSuccessMark} aria-hidden="true">
                  ✓
                </div>
                <h3 ref={submitSuccessRef} tabIndex={-1}>
                  Submission received
                </h3>
                <p>Thanks. Your evaluation has been submitted.</p>
                <div className={styles.submitSuccessActions}>
                  <button
                    type="button"
                    onClick={() => {
                      setSubmitLanguageQuery("")
                      setSubmitLanguageId(null)
                      setSubmitSuccess(false)
                    }}
                  >
                    Submit another
                  </button>
                  <button type="button" onClick={() => setSubmitOpen(false)}>
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form
                className={styles.submitModalBody}
                onSubmit={(event) => {
                  event.preventDefault()
                  if (!submitLanguageId) {
                    submitLanguageInputRef.current?.setCustomValidity(
                      "Select a language from the suggestions."
                    )
                    submitLanguageInputRef.current?.reportValidity()
                    return
                  }
                  setSubmitLanguageFocused(false)
                  setSubmitSuccess(true)
                }}
              >
                <div className={styles.submitFormGrid}>
                  <label className={styles.submitLanguageField}>
                    <span>Language</span>
                    <input
                      ref={submitLanguageInputRef}
                      type="search"
                      role="combobox"
                      required
                      autoComplete="off"
                      aria-autocomplete="list"
                      aria-controls="submit-language-options"
                      aria-expanded={submitLanguageMatches.length > 0}
                      placeholder="Search name, ISO, or Glottocode"
                      value={submitLanguageQuery}
                      onChange={(event) => {
                        event.currentTarget.setCustomValidity("")
                        setSubmitLanguageQuery(event.target.value)
                        setSubmitLanguageId(null)
                      }}
                      onFocus={() => setSubmitLanguageFocused(true)}
                      onBlur={(event) => {
                        if (
                          !event.currentTarget.parentElement?.contains(
                            event.relatedTarget
                          )
                        ) {
                          setSubmitLanguageFocused(false)
                        }
                      }}
                    />
                    {submitLanguageMatches.length ? (
                      <div
                        id="submit-language-options"
                        className={styles.submitLanguageResults}
                        role="listbox"
                      >
                        {submitLanguageMatches.map((language) => (
                          <button
                            type="button"
                            role="option"
                            aria-selected={false}
                            key={language.id}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              setSubmitLanguageQuery(language.name)
                              setSubmitLanguageId(language.id)
                              setSubmitLanguageFocused(false)
                              submitLanguageInputRef.current?.setCustomValidity(
                                ""
                              )
                            }}
                          >
                            <span>{language.name}</span>
                            <code>{language.iso ?? language.id}</code>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </label>

                  <label>
                    <span>Evaluation type</span>
                    <select required defaultValue="">
                      <option value="" disabled>
                        Select a type
                      </option>
                      <option>Text / LLM</option>
                      <option>Translation</option>
                      <option>Voice</option>
                      <option>Multimodal</option>
                    </select>
                  </label>

                  <label className={styles.submitFullField}>
                    <span>Evaluation name</span>
                    <input
                      required
                      placeholder="For example, Belebele or Uhura"
                    />
                  </label>

                  <label className={styles.submitFullField}>
                    <span>Paper title</span>
                    <input required placeholder="Title as published" />
                  </label>

                  <label className={styles.submitFullField}>
                    <span>Paper link</span>
                    <input
                      required
                      type="url"
                      inputMode="url"
                      placeholder="https:// or DOI link"
                    />
                  </label>

                  <label className={styles.submitFullField}>
                    <span>Notes · optional</span>
                    <textarea
                      rows={3}
                      placeholder="Anything that will help us verify the submission"
                    />
                  </label>

                  <label className={styles.submitFullField}>
                    <span>Your email · optional</span>
                    <input
                      type="email"
                      inputMode="email"
                      placeholder="For review questions"
                    />
                  </label>
                </div>
                <footer className={styles.submitFormActions}>
                  <div>
                    <button type="button" onClick={() => setSubmitOpen(false)}>
                      Cancel
                    </button>
                    <button type="submit">Submit evaluation</button>
                  </div>
                </footer>
              </form>
            )}
          </section>
        </>
      ) : null}
    </main>
  )
}
