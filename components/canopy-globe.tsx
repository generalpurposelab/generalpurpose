"use client"

import type { Globe } from "cobe"
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react"

import { loadCobe } from "@/components/canopy-globe-loader"
import { THEME_CHANGE_EVENT } from "@/components/theme-toggle"

const GLOBE_SIZE = 560
const INITIAL_PHI = 3.32
const INITIAL_THETA = 0.04

const ATLAS_LANGUAGES = [
  {
    id: "lang-yor",
    location: [7.4, 3.9],
    name: "Yoruba",
    nativeName: "Èdè Yorùbá",
    isoCode: "yor",
    region: "West Africa",
    family: "Niger-Congo",
    speakers: "40 million speakers",
    benchmark: {
      name: "Uhura",
      year: 2024,
      tasks: ["ARC-Easy", "TruthfulQA"],
    },
    benchmarkCount: 19,
  },
  {
    id: "lang-swa",
    location: [-6, 36.8],
    name: "Swahili",
    nativeName: "Kiswahili",
    isoCode: "swa",
    region: "East Africa",
    family: "Niger-Congo (Bantu)",
    speakers: "16 million speakers",
    benchmark: {
      name: "Uhura",
      year: 2024,
      tasks: ["ARC-Easy", "TruthfulQA"],
    },
    benchmarkCount: 22,
  },
  {
    id: "lang-mlg",
    location: [-19, 46.9],
    name: "Malagasy",
    nativeName: "Malagasy",
    isoCode: "mlg",
    region: "East Africa",
    family: "Austronesian",
    speakers: "18 million speakers",
    benchmark: null,
    benchmarkCount: 0,
  },
  {
    id: "lang-ind",
    location: [-6.175, 106.8275],
    name: "Indonesian",
    nativeName: null,
    isoCode: "ind",
    region: "Indonesia",
    family: "Austronesian",
    speakers: "199 million speakers",
    benchmark: {
      name: "FLORES-200",
      year: 2022,
      tasks: ["Machine translation"],
    },
    benchmarkCount: 16,
  },
  {
    id: "lang-ben",
    location: [23.7, 90.4],
    name: "Bengali",
    nativeName: "বাংলা",
    isoCode: "ben",
    region: "South Asia",
    family: "Indo-European (Indo-Aryan)",
    speakers: "230 million speakers",
    benchmark: {
      name: "IndicGLUE",
      year: 2022,
      tasks: ["NLI", "Sentiment", "QA"],
    },
    benchmarkCount: 16,
  },
  {
    id: "lang-que",
    location: [-13.5, -72],
    name: "Quechua",
    nativeName: "Runa Simi",
    isoCode: "que",
    region: "South America",
    family: "Quechuan",
    speakers: "8.9 million speakers",
    benchmark: {
      name: "WikiANN",
      year: 2019,
      tasks: ["Named entity recognition"],
    },
    benchmarkCount: 1,
  },
  {
    id: "lang-zap",
    location: [23.6, -102.6],
    name: "Zapotec",
    nativeName: null,
    isoCode: "zap",
    region: "Mexico",
    family: "Oto-Manguean",
    speakers: "777,000 speakers",
    benchmark: null,
    benchmarkCount: 0,
  },
  {
    id: "lang-nor",
    location: [60.5, 8.5],
    name: "Norwegian",
    nativeName: null,
    isoCode: "nor",
    region: "Norway",
    family: "Indo-European",
    speakers: "5.2 million speakers",
    benchmark: null,
    benchmarkCount: 0,
  },
] as const

const LANGUAGE_RELATIONSHIPS = [
  {
    id: "shared-uhura",
    languageIds: ["lang-yor", "lang-swa"],
    from: [7.4, 3.9],
    to: [-6, 36.8],
  },
  {
    id: "shared-austronesian-family",
    languageIds: ["lang-mlg", "lang-ind"],
    from: [-19, 46.9],
    to: [-6.175, 106.8275],
  },
] as const

type MarkerLabelStyle = CSSProperties & {
  "--language-visible": string
}

function globeThemeOptions(dark: boolean) {
  return {
    dark: dark ? 1 : 0,
    mapBrightness: dark ? 5 : 2,
    baseColor: (dark ? [0.55, 0.55, 0.55] : [1, 1, 1]) as [
      number,
      number,
      number,
    ],
    glowColor: (dark ? [0.22, 0.22, 0.22] : [1, 1, 1]) as [
      number,
      number,
      number,
    ],
    markers: ATLAS_LANGUAGES.map(({ benchmark, id, location }) => ({
      color: (benchmark
        ? dark
          ? [0.95, 0.95, 0.95]
          : [0.1, 0.1, 0.1]
        : dark
          ? [0.85, 0.45, 0.33]
          : [0.72, 0.29, 0.2]) as [number, number, number],
      id,
      location: [...location] as [number, number],
      size: 0.045,
    })),
  }
}

function isDarkTheme() {
  return document.documentElement.dataset.theme === "dark"
}

export function CanopyGlobe() {
  const [selectedLanguageId, setSelectedLanguageId] = useState<string | null>(
    null
  )
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const labelsRef = useRef<HTMLDivElement>(null)
  const renderGlobeRef = useRef<(() => void) | null>(null)
  const updateRelationshipsRef = useRef<
    ((languageId: string | null) => void) | null
  >(null)
  const phiRef = useRef(INITIAL_PHI)
  const thetaRef = useRef(INITIAL_THETA)
  const selectedLanguageRef = useRef<string | null>(null)
  const dragRef = useRef<{
    pointerId: number
    x: number
    y: number
    phi: number
    theta: number
  } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) return

    const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2)
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
    let disposed = false
    let globe: Globe | null = null
    let animationFrame: number | null = null
    let isVisible = true
    let labelObserver: MutationObserver | null = null

    // cobe tracks each marker with a 1px anchor div whose left/top it updates
    // every frame. CSS anchor positioning could follow those for free, but
    // Safari support is recent, so mirror the coordinates onto the labels.
    const markerAnchors = new Map<string, HTMLElement>()
    const markerLabels = new Map<string, HTMLElement>()

    const syncLabelPositions = () => {
      const cobeWrapper = canvas.parentElement
      const labelsContainer = labelsRef.current
      if (!cobeWrapper || !labelsContainer) return

      for (const { id } of ATLAS_LANGUAGES) {
        let anchor = markerAnchors.get(id)
        if (!anchor?.isConnected) {
          anchor =
            cobeWrapper.querySelector<HTMLElement>(`[style*="--cobe-${id}"]`) ??
            undefined
          if (anchor) markerAnchors.set(id, anchor)
        }

        let label = markerLabels.get(id)
        if (!label?.isConnected) {
          label =
            labelsContainer.querySelector<HTMLElement>(
              `[data-language-id="${id}"]`
            ) ?? undefined
          if (label) markerLabels.set(id, label)
        }

        if (anchor && label) {
          label.style.left = anchor.style.left
          label.style.top = anchor.style.top
        }
      }
    }

    const renderGlobe = () => {
      globe?.update({
        phi: phiRef.current,
        theta: thetaRef.current,
      })
    }

    const animate = () => {
      animationFrame = null
      if (!dragRef.current && !selectedLanguageRef.current) {
        phiRef.current += 0.003
      }
      renderGlobe()

      if (isVisible) animationFrame = window.requestAnimationFrame(animate)
    }

    const startAnimation = () => {
      if (!reducedMotion && isVisible && animationFrame === null) {
        animationFrame = window.requestAnimationFrame(animate)
      }
    }

    const stopAnimation = () => {
      if (animationFrame === null) return
      window.cancelAnimationFrame(animationFrame)
      animationFrame = null
    }

    const resizeObserver = new ResizeObserver(([entry]) => {
      const size = Math.max(
        1,
        Math.round(Math.min(entry.contentRect.width, entry.contentRect.height))
      )
      globe?.update({ width: size, height: size })
    })
    resizeObserver.observe(canvas)

    const intersectionObserver = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting
      if (isVisible) {
        renderGlobe()
        startAnimation()
      } else {
        stopAnimation()
      }
    })
    intersectionObserver.observe(canvas)

    const initialize = async () => {
      const { default: createGlobe } = await loadCobe()
      if (disposed) return

      const bounds = canvas.getBoundingClientRect()
      const size = Math.max(
        1,
        Math.round(Math.min(bounds.width, bounds.height) || GLOBE_SIZE)
      )

      globe = createGlobe(canvas, {
        devicePixelRatio,
        width: size,
        height: size,
        phi: phiRef.current,
        theta: thetaRef.current,
        diffuse: 3,
        mapSamples: size < 400 ? 14_000 : 23_000,
        mapBaseBrightness: 0,
        markerColor: [0.1, 0.1, 0.1],
        scale: 1.15,
        offset: [-10, 0],
        markerElevation: 0.02,
        arcs: [],
        arcColor: [0.3, 0.5, 1],
        arcHeight: 0.3,
        arcWidth: 0.4,
        ...globeThemeOptions(isDarkTheme()),
      })
      updateRelationshipsRef.current = (languageId) => {
        const relationships = languageId
          ? LANGUAGE_RELATIONSHIPS.filter(({ languageIds }) =>
              (languageIds as readonly string[]).includes(languageId)
            )
          : []

        globe?.update({
          arcs: relationships.map(({ id, from, to }) => ({
            id,
            from: [...from],
            to: [...to],
          })),
        })
      }
      const cobeWrapper = canvas.parentElement
      if (cobeWrapper) {
        labelObserver = new MutationObserver(syncLabelPositions)
        labelObserver.observe(cobeWrapper, {
          attributes: true,
          attributeFilter: ["style"],
          subtree: true,
        })
      }

      renderGlobeRef.current = renderGlobe
      updateRelationshipsRef.current(selectedLanguageRef.current)
      renderGlobe()
      syncLabelPositions()
      startAnimation()
    }

    const handleThemeChange = () => {
      globe?.update(globeThemeOptions(isDarkTheme()))
      renderGlobe()
    }
    window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange)

    void initialize().catch((error: unknown) => {
      if (!disposed) console.error("Unable to initialize Canopy globe", error)
    })

    return () => {
      disposed = true
      renderGlobeRef.current = null
      updateRelationshipsRef.current = null
      window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange)
      labelObserver?.disconnect()
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      stopAnimation()
      globe?.destroy()
    }
  }, [])

  const selectLanguage = (languageId: string | null) => {
    selectedLanguageRef.current = languageId
    setSelectedLanguageId(languageId)
    updateRelationshipsRef.current?.(languageId)
  }

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    selectLanguage(null)
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      phi: phiRef.current,
      theta: thetaRef.current,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current

    if (!drag || drag.pointerId !== event.pointerId) return

    phiRef.current = drag.phi + (event.clientX - drag.x) / 150
    thetaRef.current = Math.max(
      -1.15,
      Math.min(1.15, drag.theta + (event.clientY - drag.y) / 300)
    )
    renderGlobeRef.current?.()
  }

  const handlePointerEnd = (event: PointerEvent<HTMLCanvasElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return

    dragRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLCanvasElement>) => {
    const keyAdjustments: Partial<Record<string, [number, number]>> = {
      ArrowLeft: [-0.14, 0],
      ArrowRight: [0.14, 0],
      ArrowUp: [0, -0.12],
      ArrowDown: [0, 0.12],
    }
    const adjustment = keyAdjustments[event.key]

    if (!adjustment) return

    event.preventDefault()
    phiRef.current += adjustment[0]
    thetaRef.current = Math.max(
      -1.15,
      Math.min(1.15, thetaRef.current + adjustment[1])
    )
    renderGlobeRef.current?.()
  }

  const handleLanguageKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "Escape") return

    event.preventDefault()
    selectLanguage(null)
  }

  return (
    <div className="canopy-globe-wrap">
      <canvas
        ref={canvasRef}
        width={GLOBE_SIZE}
        height={GLOBE_SIZE}
        className="canopy-globe-canvas"
        role="img"
        aria-label="Interactive atlas of languages and benchmark coverage. Drag or use the arrow keys to rotate."
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      />
      <div className="canopy-language-labels" ref={labelsRef}>
        {ATLAS_LANGUAGES.map((language) => {
          const {
            benchmark,
            benchmarkCount,
            family,
            id,
            isoCode,
            name,
            nativeName,
            region,
            speakers,
          } = language
          const visibility = `var(--cobe-visible-${id}, 0)`
          const isSelected = selectedLanguageId === id
          const benchmarkSummary = benchmark
            ? `${benchmarkCount} benchmark${benchmarkCount === 1 ? "" : "s"}`
            : "No benchmark yet"
          const style: MarkerLabelStyle = {
            "--language-visible": visibility,
            opacity: visibility,
          }

          return (
            <button
              aria-expanded={isSelected}
              aria-label={`${name}, ${benchmarkSummary.toLowerCase()}`}
              className="canopy-language-label"
              data-expanded={isSelected}
              data-language-id={id}
              data-status={benchmark ? "benchmarked" : "needed"}
              key={id}
              onClick={() => selectLanguage(isSelected ? null : id)}
              onKeyDown={handleLanguageKeyDown}
              style={style}
              type="button"
            >
              <span className="canopy-language-heading">
                <span className="canopy-language-name">{name}</span>
                {nativeName && nativeName !== name ? (
                  <span className="canopy-language-native">{nativeName}</span>
                ) : null}
              </span>
              {isSelected ? (
                <span className="canopy-language-details">
                  <span className="canopy-language-meta">
                    <span>{region}</span>
                    <span>{speakers}</span>
                    <span>{family}</span>
                    <span>{isoCode}</span>
                  </span>
                  <span className="canopy-language-status">
                    <span className="canopy-language-status-dot" />
                    {benchmarkSummary}
                  </span>
                  {benchmark ? (
                    <span className="canopy-language-benchmark">
                      <span>
                        {benchmark.name} · {benchmark.year}
                      </span>
                      <span>{benchmark.tasks.join(" · ")}</span>
                    </span>
                  ) : (
                    <span className="canopy-language-needed">
                      Benchmark needed
                    </span>
                  )}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
