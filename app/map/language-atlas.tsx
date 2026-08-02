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
  {
    loading: () => (
      <div className={styles.globeLoading}>Drawing the atlas…</div>
    ),
  }
)

const FILTERS: { id: AtlasFilter; label: string }[] = [
  { id: "all", label: "All languages" },
  { id: "text", label: "Text / LLM" },
  { id: "translation", label: "Translation" },
  { id: "speech", label: "Voice" },
  { id: "gaps", label: "Coverage gaps" },
]

const PAGE_SIZE = 100

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
          title={`${label}: ${domains.has(domain) ? "coverage linked" : "not observed"}`}
        >
          <DomainDot domain={domain} />
          {withLabels ? label : null}
        </span>
      ))}
    </span>
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
              <strong>No indexed resource yet</strong>
              <p>
                This is an observed catalogue gap, not proof that no resource
                exists.
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
        mode === "methodology" ? "Atlas methodology" : "Resource index"
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
          <h2>A map of evidence, not a binary label.</h2>
          <p className={styles.drawerIntro}>{data.definition}</p>

          <section className={styles.methodBlock}>
            <span className={styles.sectionLabel}>What a point means</span>
            <p>
              Every row is a Glottolog language-level entry. Its point is a
              representative coordinate, not a border or a complete account of
              where its speakers live. Variants and scripts are aggregated only
              for atlas navigation.
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
            Browse the indexed projects directly. “Mapped” counts are
            conservative joins to the Glottolog language inventory.
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
  const [filter, setFilter] = useState<AtlasFilter>("all")
  const [macroarea, setMacroarea] = useState("all")
  const [query, setQuery] = useState("")
  const [searchFocused, setSearchFocused] = useState(false)
  const [selectedLanguage, setSelectedLanguage] =
    useState<AtlasLanguage | null>(null)
  const [drawer, setDrawer] = useState<"methodology" | "resources" | null>(null)
  const [page, setPage] = useState(1)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const deferredQuery = useDeferredValue(query)

  useEffect(() => {
    const controller = new AbortController()
    void fetch("/data/language-atlas.json", { signal: controller.signal })
      .then((response) => {
        if (!response.ok)
          throw new Error(`Atlas data returned ${response.status}`)
        return response.json() as Promise<AtlasData>
      })
      .then(setData)
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError")
          return
        setError(
          reason instanceof Error ? reason.message : "Unable to load the atlas"
        )
      })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "/" && !(event.target instanceof HTMLInputElement)) {
        event.preventDefault()
        searchInputRef.current?.focus()
        return
      }
      if (event.key === "Escape") {
        if (drawer) setDrawer(null)
        else if (selectedLanguage) setSelectedLanguage(null)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [drawer, selectedLanguage])

  const macroareas = useMemo(
    () =>
      data
        ? [
            ...new Set(data.languages.map((language) => language.macroarea)),
          ].sort()
        : [],
    [data]
  )

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

  if (error) {
    return (
      <main className={styles.errorState}>
        <span>Language atlas</span>
        <h1>The atlas data could not be loaded.</h1>
        <p>{error}</p>
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
        <span>Indexing the world’s languages…</span>
      </main>
    )
  }

  const pageCount = Math.max(1, Math.ceil(filteredLanguages.length / PAGE_SIZE))
  const visibleRows = filteredLanguages.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  )
  const searchResults = query.trim() ? filteredLanguages.slice(0, 7) : []
  const mapLanguages = filteredLanguages

  return (
    <main className={styles.atlas} data-view={view}>
      <header className={styles.header}>
        <div className={styles.brandBlock}>
          <Link
            href="/"
            className={styles.wordmark}
            aria-label="General Purpose home"
          >
            GP
          </Link>
          <div>
            <span>Uhura language atlas</span>
            <small>Global language technology coverage</small>
          </div>
        </div>

        <div className={styles.viewToggle} aria-label="Atlas view">
          <button
            type="button"
            data-active={view === "map"}
            onClick={() => setView("map")}
          >
            Globe
          </button>
          <button
            type="button"
            data-active={view === "table"}
            onClick={() => setView("table")}
          >
            Table
          </button>
        </div>

        <nav className={styles.headerLinks} aria-label="Atlas information">
          <button type="button" onClick={() => setDrawer("resources")}>
            {data.resources.length} resources
          </button>
          <button type="button" onClick={() => setDrawer("methodology")}>
            Methodology
          </button>
        </nav>
      </header>

      <section className={styles.controls} aria-label="Language filters">
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
            placeholder="Search language, ISO code, family…"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setPage(1)
            }}
            onFocus={() => setSearchFocused(true)}
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("")
                setPage(1)
              }}
              aria-label="Clear search"
            >
              <CloseIcon />
            </button>
          ) : (
            <kbd>/</kbd>
          )}
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
                      setSelectedLanguage(language)
                      setSearchFocused(false)
                      setView("map")
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
                <p>No language matches this search.</p>
              )}
            </div>
          ) : null}
        </div>

        <div className={styles.filterRow}>
          {FILTERS.map((item) => (
            <button
              type="button"
              key={item.id}
              data-active={filter === item.id}
              onClick={() => {
                setFilter(item.id)
                setPage(1)
              }}
            >
              {item.id !== "all" ? (
                <DomainDot domain={item.id === "gaps" ? "gap" : item.id} />
              ) : null}
              {item.label}
            </button>
          ))}
        </div>

        <label className={styles.macroareaSelect}>
          <span className={styles.srOnly}>Macroarea</span>
          <select
            value={macroarea}
            onChange={(event) => {
              setMacroarea(event.target.value)
              setPage(1)
            }}
          >
            <option value="all">All regions</option>
            {macroareas.map((area) => (
              <option key={area}>{area}</option>
            ))}
          </select>
        </label>

        <div className={styles.mobileLinks}>
          <button type="button" onClick={() => setDrawer("resources")}>
            Resources
          </button>
          <button type="button" onClick={() => setDrawer("methodology")}>
            Methods
          </button>
        </div>
      </section>

      <section className={styles.mapStage} hidden={view !== "map"}>
        <LanguageGlobe
          languages={mapLanguages}
          resources={data.resources}
          selectedLanguage={selectedLanguage}
          onSelect={setSelectedLanguage}
        />

        <div className={styles.mapStats}>
          <strong>{formatNumber(filteredLanguages.length)}</strong>
          <span>
            {filteredLanguages.length === data.stats.languages
              ? "catalogued languages"
              : "visible languages"}
          </span>
          <small>
            {formatNumber(
              filteredLanguages.filter((language) => language.latitude !== null)
                .length
            )}{" "}
            with map coordinates
          </small>
        </div>

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
      </section>

      <section className={styles.tableStage} hidden={view !== "table"}>
        <div className={styles.tableIntro}>
          <div>
            <span className={styles.sectionLabel}>Language inventory</span>
            <h1>{formatNumber(filteredLanguages.length)} languages</h1>
          </div>
          <p>
            Full Glottolog language-level inventory. Coverage is evidence from
            the linked catalogue—not a claim about a language’s intrinsic
            resource status.
          </p>
        </div>

        <div className={styles.tableScroll}>
          <table>
            <thead>
              <tr>
                <th>Language</th>
                <th>ISO / Glottocode</th>
                <th>Macroarea</th>
                <th>Family</th>
                <th>Coverage</th>
                <th>Resources</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((language) => (
                <tr key={language.id}>
                  <td>
                    <button
                      type="button"
                      onClick={() => setSelectedLanguage(language)}
                    >
                      <strong>{language.name}</strong>
                      {language.varieties[0] ? (
                        <small>{language.varieties[0]}</small>
                      ) : null}
                    </button>
                  </td>
                  <td>
                    <code>{language.iso ?? "—"}</code>
                    <small>{language.id}</small>
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
              <strong>No matching languages</strong>
              <button
                type="button"
                onClick={() => {
                  setQuery("")
                  setFilter("all")
                  setMacroarea("all")
                }}
              >
                Clear filters
              </button>
            </div>
          ) : null}
        </div>

        {pageCount > 1 ? (
          <nav className={styles.pagination} aria-label="Language table pages">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </button>
            <span>
              Page {page} of {pageCount}
            </span>
            <button
              type="button"
              disabled={page === pageCount}
              onClick={() =>
                setPage((current) => Math.min(pageCount, current + 1))
              }
            >
              Next
            </button>
          </nav>
        ) : null}
      </section>

      {selectedLanguage ? (
        <>
          <button
            className={styles.panelScrim}
            type="button"
            onClick={() => setSelectedLanguage(null)}
            aria-label="Close language details"
          />
          <LanguageDetail
            language={selectedLanguage}
            resources={data.resources}
            onClose={() => setSelectedLanguage(null)}
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
    </main>
  )
}
