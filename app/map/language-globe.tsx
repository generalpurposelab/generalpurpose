"use client"

import {
  geoContains,
  geoDistance,
  geoGraticule10,
  geoOrthographic,
  geoPath,
} from "d3-geo"
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react"
import { feature, mesh } from "topojson-client"
import type {
  GeometryCollection,
  GeometryObject,
  Objects,
  Topology,
} from "topojson-specification"
import worldAtlas from "world-atlas/countries-110m.json"

import { THEME_CHANGE_EVENT } from "@/components/theme-toggle"

import type { AtlasLanguage, AtlasResource } from "./atlas-types"
import styles from "./map.module.css"

const VIEWBOX_SIZE = 720
const GLOBE_RADIUS = VIEWBOX_SIZE * 0.432
const INITIAL_CENTER = { latitude: 8, longitude: 18 }
const HALF_PI = Math.PI / 2

type Color = [number, number, number]

interface WorldObjects extends Objects {
  countries: GeometryCollection
  land: GeometryCollection
}

interface LanguageGlobeProps {
  languages: AtlasLanguage[]
  resources: AtlasResource[]
  selectedLanguage: AtlasLanguage | null
  onSelect: (language: AtlasLanguage | null) => void
}

interface ProjectedPoint {
  x: number
  y: number
  visible: boolean
}

interface PreparedLanguage {
  language: AtlasLanguage
  color: Color
  size: number
}

interface HoveredCountry {
  name: string
  point: ProjectedPoint
}

const topology = worldAtlas as unknown as Topology<WorldObjects>
const land = feature(topology, topology.objects.land)
const countries = feature(topology, topology.objects.countries)
const borders = mesh(
  topology,
  topology.objects.countries,
  (a: GeometryObject, b: GeometryObject) => a !== b
)
const graticule = geoGraticule10()
const projection = geoOrthographic()
  .translate([VIEWBOX_SIZE / 2, VIEWBOX_SIZE / 2])
  .scale(GLOBE_RADIUS)
  .clipAngle(90)
  .precision(0.35)
const path = geoPath(projection)

function languageDomains(language: AtlasLanguage, resources: AtlasResource[]) {
  const domains = new Set(
    language.resources.map((resourceId) => resources[resourceId]?.domain)
  )
  return {
    speech: domains.has("speech"),
    text: domains.has("text"),
    translation: domains.has("translation"),
  }
}

function markerStyle(language: AtlasLanguage, resources: AtlasResource[]) {
  const domains = languageDomains(language, resources)
  if (domains.speech && domains.text && domains.translation) {
    return { color: [0.16, 0.39, 0.95] as Color, size: 3.4 }
  }
  if (domains.speech) return { color: [0.76, 0.22, 0.64] as Color, size: 2.8 }
  if (domains.translation) {
    return { color: [0.96, 0.46, 0.16] as Color, size: 2.8 }
  }
  if (domains.text) return { color: [0.14, 0.64, 0.43] as Color, size: 2.5 }
  return { color: [0.49, 0.52, 0.55] as Color, size: 1.25 }
}

function cssColor(color: Color, alpha = 1) {
  const [red, green, blue] = color.map((channel) => Math.round(channel * 255))
  return `rgb(${red} ${green} ${blue} / ${alpha})`
}

function isVisible(
  latitude: number,
  longitude: number,
  center: { latitude: number; longitude: number }
) {
  return (
    geoDistance([longitude, latitude], [center.longitude, center.latitude]) <=
    HALF_PI + 0.015
  )
}

function projectLocation(
  language: AtlasLanguage,
  center: { latitude: number; longitude: number }
): ProjectedPoint | null {
  if (language.latitude === null || language.longitude === null) return null
  const point = projection([language.longitude, language.latitude])
  if (!point) return null
  return {
    x: point[0] / VIEWBOX_SIZE,
    y: point[1] / VIEWBOX_SIZE,
    visible: isVisible(language.latitude, language.longitude, center),
  }
}

export function LanguageGlobe({
  languages,
  resources,
  selectedLanguage,
  onSelect,
}: LanguageGlobeProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const landRef = useRef<SVGPathElement>(null)
  const countryHighlightRef = useRef<SVGPathElement>(null)
  const bordersRef = useRef<SVGPathElement>(null)
  const graticuleRef = useRef<SVGPathElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const centerRef = useRef(INITIAL_CENTER)
  const renderRef = useRef<(() => void) | null>(null)
  const languagesRef = useRef(languages)
  const preparedRef = useRef<PreparedLanguage[]>([])
  const selectedRef = useRef(selectedLanguage)
  const hoveredCountryFeatureRef = useRef<
    (typeof countries.features)[number] | null
  >(null)
  const hoveringRef = useRef(false)
  const dragRef = useRef<{
    pointerId: number
    x: number
    y: number
    latitude: number
    longitude: number
    moved: boolean
  } | null>(null)
  const hoverFrameRef = useRef<number | null>(null)
  const pendingPointerRef = useRef<{ x: number; y: number } | null>(null)
  const [hoveredLanguage, setHoveredLanguage] = useState<AtlasLanguage | null>(
    null
  )
  const [hoverPoint, setHoverPoint] = useState<ProjectedPoint | null>(null)
  const [hoveredCountry, setHoveredCountry] = useState<HoveredCountry | null>(
    null
  )

  const preparedLanguages = useMemo<PreparedLanguage[]>(
    () =>
      languages.flatMap((language) => {
        if (language.latitude === null || language.longitude === null) return []
        return [{ language, ...markerStyle(language, resources) }]
      }),
    [languages, resources]
  )

  useEffect(() => {
    languagesRef.current = languages
  }, [languages])

  useEffect(() => {
    preparedRef.current = preparedLanguages
    renderRef.current?.()
  }, [preparedLanguages])

  useEffect(() => {
    selectedRef.current = selectedLanguage
    if (
      selectedLanguage &&
      selectedLanguage.latitude !== null &&
      selectedLanguage.longitude !== null
    ) {
      centerRef.current = {
        latitude: selectedLanguage.latitude,
        longitude: selectedLanguage.longitude,
      }
    }
    renderRef.current?.()
  }, [selectedLanguage])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2)
    const context = canvas.getContext("2d")
    if (!context) return
    canvas.width = VIEWBOX_SIZE * devicePixelRatio
    canvas.height = VIEWBOX_SIZE * devicePixelRatio
    context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
    let animationFrame: number | null = null
    let disposed = false
    let lastFrame = 0
    let visible = true

    const render = () => {
      const center = centerRef.current
      projection.rotate([-center.longitude, -center.latitude, 0])

      landRef.current?.setAttribute("d", path(land) ?? "")
      countryHighlightRef.current?.setAttribute(
        "d",
        hoveredCountryFeatureRef.current
          ? (path(hoveredCountryFeatureRef.current) ?? "")
          : ""
      )
      bordersRef.current?.setAttribute("d", path(borders) ?? "")
      graticuleRef.current?.setAttribute("d", path(graticule) ?? "")

      context.clearRect(0, 0, VIEWBOX_SIZE, VIEWBOX_SIZE)
      const selectedId = selectedRef.current?.id

      for (const item of preparedRef.current) {
        const { language } = item
        if (
          language.latitude === null ||
          language.longitude === null ||
          !isVisible(language.latitude, language.longitude, center)
        ) {
          continue
        }
        const point = projection([language.longitude, language.latitude])
        if (!point) continue
        const selected = language.id === selectedId
        const radius = selected ? 6.8 : item.size

        context.beginPath()
        context.arc(point[0], point[1], radius, 0, Math.PI * 2)
        context.fillStyle = selected
          ? isDarkTheme()
            ? "#f5f3ec"
            : "#17191c"
          : cssColor(item.color, item.size < 2 ? 0.72 : 0.9)
        context.fill()
        if (selected) {
          context.lineWidth = 2
          context.strokeStyle = isDarkTheme() ? "#17191c" : "#faf9f5"
          context.stroke()
        }
      }
    }
    renderRef.current = render
    render()

    const animate = (time: number) => {
      animationFrame = null
      if (disposed || !visible) return
      if (time - lastFrame >= 30) {
        lastFrame = time
        if (!dragRef.current && !selectedRef.current && !hoveringRef.current) {
          centerRef.current = {
            ...centerRef.current,
            longitude: centerRef.current.longitude - 0.055,
          }
        }
        render()
      }
      animationFrame = window.requestAnimationFrame(animate)
    }

    const start = () => {
      if (!reducedMotion && visible && animationFrame === null) {
        animationFrame = window.requestAnimationFrame(animate)
      }
    }

    const stop = () => {
      if (animationFrame === null) return
      window.cancelAnimationFrame(animationFrame)
      animationFrame = null
    }

    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible) {
        render()
        start()
      } else {
        stop()
      }
    })
    if (svgRef.current) intersectionObserver.observe(svgRef.current)

    const handleThemeChange = () => render()
    window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange)
    start()

    return () => {
      disposed = true
      renderRef.current = null
      window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange)
      intersectionObserver.disconnect()
      stop()
    }
  }, [])

  const findNearestLanguage = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const bounds = canvas.getBoundingClientRect()
    const localX = ((clientX - bounds.left) / bounds.width) * VIEWBOX_SIZE
    const localY = ((clientY - bounds.top) / bounds.height) * VIEWBOX_SIZE
    let nearest: {
      language: AtlasLanguage
      point: ProjectedPoint
      distance: number
    } | null = null

    for (const language of languagesRef.current) {
      const point = projectLocation(language, centerRef.current)
      if (!point?.visible) continue
      const dx = point.x * VIEWBOX_SIZE - localX
      const dy = point.y * VIEWBOX_SIZE - localY
      const distance = Math.hypot(dx, dy)
      const hitRadius = (13 / bounds.width) * VIEWBOX_SIZE
      if (distance <= hitRadius && (!nearest || distance < nearest.distance)) {
        nearest = { language, point, distance }
      }
    }
    return nearest
  }

  const findCountry = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const bounds = canvas.getBoundingClientRect()
    const localX = ((clientX - bounds.left) / bounds.width) * VIEWBOX_SIZE
    const localY = ((clientY - bounds.top) / bounds.height) * VIEWBOX_SIZE
    const distanceFromCenter = Math.hypot(
      localX - VIEWBOX_SIZE / 2,
      localY - VIEWBOX_SIZE / 2
    )
    if (distanceFromCenter > GLOBE_RADIUS) return null

    const location = projection.invert?.([localX, localY])
    if (!location) return null

    for (const country of countries.features) {
      const name = (country.properties as { name?: unknown } | null)?.name
      if (typeof name === "string" && geoContains(country, location)) {
        return {
          feature: country,
          name,
          point: {
            x: localX / VIEWBOX_SIZE,
            y: localY / VIEWBOX_SIZE,
            visible: true,
          },
        }
      }
    }
    return null
  }

  const scheduleHover = (clientX: number, clientY: number) => {
    pendingPointerRef.current = { x: clientX, y: clientY }
    if (hoverFrameRef.current !== null) return
    hoverFrameRef.current = window.requestAnimationFrame(() => {
      hoverFrameRef.current = null
      const pointer = pendingPointerRef.current
      if (!pointer || dragRef.current) return
      const nearest = findNearestLanguage(pointer.x, pointer.y)
      setHoveredLanguage(nearest?.language ?? null)
      setHoverPoint(nearest?.point ?? null)
      if (nearest) {
        hoveringRef.current = true
        hoveredCountryFeatureRef.current = null
        setHoveredCountry(null)
      } else {
        const country = findCountry(pointer.x, pointer.y)
        hoveringRef.current = Boolean(country)
        hoveredCountryFeatureRef.current = country?.feature ?? null
        setHoveredCountry(
          country ? { name: country.name, point: country.point } : null
        )
      }
      renderRef.current?.()
    })
  }

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      latitude: centerRef.current.latitude,
      longitude: centerRef.current.longitude,
      moved: false,
    }
    hoveringRef.current = false
    hoveredCountryFeatureRef.current = null
    setHoveredLanguage(null)
    setHoverPoint(null)
    setHoveredCountry(null)
    renderRef.current?.()
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) {
      scheduleHover(event.clientX, event.clientY)
      return
    }
    const bounds = event.currentTarget.getBoundingClientRect()
    const dx = event.clientX - drag.x
    const dy = event.clientY - drag.y
    if (Math.hypot(dx, dy) > 4) drag.moved = true
    centerRef.current = {
      longitude: drag.longitude - (dx / bounds.width) * 190,
      latitude: Math.max(
        -80,
        Math.min(80, drag.latitude + (dy / bounds.height) * 130)
      ),
    }
    renderRef.current?.()
  }

  const handlePointerEnd = (event: PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    dragRef.current = null
    if (!drag.moved) {
      const nearest = findNearestLanguage(event.clientX, event.clientY)
      onSelect(nearest?.language ?? null)
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLCanvasElement>) => {
    const adjustments: Partial<Record<string, [number, number]>> = {
      ArrowLeft: [-10, 0],
      ArrowRight: [10, 0],
      ArrowUp: [0, 8],
      ArrowDown: [0, -8],
    }
    const adjustment = adjustments[event.key]
    if (!adjustment) return
    event.preventDefault()
    onSelect(null)
    centerRef.current = {
      longitude: centerRef.current.longitude + adjustment[0],
      latitude: Math.max(
        -80,
        Math.min(80, centerRef.current.latitude + adjustment[1])
      ),
    }
    renderRef.current?.()
  }

  return (
    <div className={styles.globeWrap}>
      <svg
        ref={svgRef}
        className={styles.globeVectorLayer}
        viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
        aria-hidden="true"
      >
        <circle
          className={styles.globeOcean}
          cx={VIEWBOX_SIZE / 2}
          cy={VIEWBOX_SIZE / 2}
          r={GLOBE_RADIUS}
        />
        <path ref={graticuleRef} className={styles.globeGraticule} />
        <path ref={landRef} className={styles.globeLand} />
        <path
          ref={countryHighlightRef}
          className={styles.globeCountryHighlight}
        />
        <path ref={bordersRef} className={styles.globeBorders} />
        <circle
          className={styles.globeOutline}
          cx={VIEWBOX_SIZE / 2}
          cy={VIEWBOX_SIZE / 2}
          r={GLOBE_RADIUS}
        />
      </svg>
      <canvas
        ref={canvasRef}
        className={styles.globeCanvas}
        width={VIEWBOX_SIZE}
        height={VIEWBOX_SIZE}
        role="img"
        tabIndex={0}
        aria-label="Interactive vector globe of world languages. Drag or use arrow keys to rotate; hover a country for its name; select a language location for details."
        onKeyDown={handleKeyDown}
        onPointerCancel={handlePointerEnd}
        onPointerDown={handlePointerDown}
        onPointerLeave={() => {
          hoveringRef.current = false
          hoveredCountryFeatureRef.current = null
          setHoveredLanguage(null)
          setHoverPoint(null)
          setHoveredCountry(null)
          renderRef.current?.()
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
      />
      {hoveredLanguage && hoverPoint ? (
        <div
          className={styles.mapTooltip}
          style={{
            left: `${hoverPoint.x * 100}%`,
            top: `${hoverPoint.y * 100}%`,
          }}
        >
          <strong>{hoveredLanguage.name}</strong>
          <span>
            {hoveredLanguage.resources.length
              ? `${hoveredLanguage.resources.length} linked resource${hoveredLanguage.resources.length === 1 ? "" : "s"}`
              : "Coverage not yet observed"}
          </span>
        </div>
      ) : hoveredCountry ? (
        <div
          className={styles.mapTooltip}
          data-kind="country"
          style={{
            left: `${hoveredCountry.point.x * 100}%`,
            top: `${hoveredCountry.point.y * 100}%`,
          }}
        >
          <strong>{hoveredCountry.name}</strong>
          <span>Country boundary · Natural Earth</span>
        </div>
      ) : null}
      <div className={styles.globeHint}>
        Drag to rotate · hover countries · select a language
      </div>
    </div>
  )
}

function isDarkTheme() {
  return document.documentElement.dataset.theme === "dark"
}
