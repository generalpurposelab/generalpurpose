"use client"

import {
  geoContains,
  geoDistance,
  geoGraticule10,
  geoOrthographic,
  geoPath,
} from "d3-geo"
import {
  useCallback,
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
const MIN_ZOOM = 1
const MAX_ZOOM = 2.4
const ZOOM_STEP = 1.16

type Color = [number, number, number]

const HOME_ORANGE: Color = [253 / 255, 120 / 255, 4 / 255]
const HOME_BLUE: Color = [1 / 255, 110 / 255, 253 / 255]

interface WorldObjects extends Objects {
  countries: GeometryCollection
  land: GeometryCollection
}

interface LanguageGlobeProps {
  languages: AtlasLanguage[]
  resources: AtlasResource[]
  resetVersion: number
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
    return { color: HOME_BLUE, size: 3.4 }
  }
  if (domains.speech) return { color: [0.76, 0.22, 0.64] as Color, size: 2.8 }
  if (domains.translation) {
    return { color: HOME_ORANGE, size: 2.8 }
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
  resetVersion,
  selectedLanguage,
  onSelect,
}: LanguageGlobeProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const landRef = useRef<SVGPathElement>(null)
  const countryHighlightRef = useRef<SVGPathElement>(null)
  const bordersRef = useRef<SVGPathElement>(null)
  const graticuleRef = useRef<SVGPathElement>(null)
  const selectionSignalRef = useRef<SVGGElement>(null)
  const zoomLayerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const centerRef = useRef(INITIAL_CENTER)
  const zoomRef = useRef(MIN_ZOOM)
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
  const activePointersRef = useRef(new Map<number, { x: number; y: number }>())
  const pinchRef = useRef<{
    distance: number
    zoom: number
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

  const clearHover = useCallback(() => {
    hoveringRef.current = false
    hoveredCountryFeatureRef.current = null
    setHoveredLanguage(null)
    setHoverPoint(null)
    setHoveredCountry(null)
  }, [])

  const getBaseScale = useCallback((engaged: boolean) => {
    const layer = zoomLayerRef.current
    const fallback = engaged ? 0.82 : 0.53
    if (!layer) return fallback
    const property = engaged ? "--globe-focus-scale" : "--globe-rest-scale"
    const scale = Number.parseFloat(
      window.getComputedStyle(layer).getPropertyValue(property)
    )
    return Number.isFinite(scale) ? scale : fallback
  }, [])

  const setZoom = useCallback(
    (zoom: number) => {
      zoomRef.current = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom))
      const layer = zoomLayerRef.current
      if (!layer) return
      layer.dataset.directZoom = "true"
      layer.style.setProperty(
        "--globe-scale",
        String(getBaseScale(Boolean(selectedRef.current)) * zoomRef.current)
      )
      layer.style.setProperty(
        "--globe-label-scale",
        String(1 / zoomRef.current)
      )
      renderRef.current?.()
    },
    [getBaseScale]
  )

  const settleZoom = useCallback(
    (engaged: boolean) => {
      zoomRef.current = MIN_ZOOM
      const layer = zoomLayerRef.current
      if (!layer) return
      layer.dataset.directZoom = "false"
      layer.style.setProperty("--globe-scale", String(getBaseScale(engaged)))
      layer.style.setProperty("--globe-label-scale", "1")
      renderRef.current?.()
    },
    [getBaseScale]
  )

  const applyZoom = useCallback(
    (zoom: number) => {
      setZoom(zoom)
      clearHover()
    },
    [clearHover, setZoom]
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
    settleZoom(Boolean(selectedLanguage))
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
  }, [selectedLanguage, settleZoom])

  useEffect(() => {
    centerRef.current = { ...INITIAL_CENTER }
    settleZoom(false)
  }, [resetVersion, settleZoom])

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
    let selectedFill = "#f5f3ec"
    let selectedStroke = "#101012"

    const render = () => {
      const center = centerRef.current
      projection.rotate([-center.longitude, -center.latitude, 0])
      projection.scale(GLOBE_RADIUS)

      landRef.current?.setAttribute("d", path(land) ?? "")
      countryHighlightRef.current?.setAttribute(
        "d",
        hoveredCountryFeatureRef.current
          ? (path(hoveredCountryFeatureRef.current) ?? "")
          : ""
      )
      bordersRef.current?.setAttribute("d", path(borders) ?? "")
      graticuleRef.current?.setAttribute("d", path(graticule) ?? "")

      const selectedLanguage = selectedRef.current
      const selectedPoint = selectedLanguage
        ? projectLocation(selectedLanguage, center)
        : null
      if (selectionSignalRef.current) {
        if (selectedPoint?.visible) {
          selectionSignalRef.current.setAttribute(
            "transform",
            `translate(${selectedPoint.x * VIEWBOX_SIZE} ${selectedPoint.y * VIEWBOX_SIZE})`
          )
          selectionSignalRef.current.style.display = ""
        } else {
          selectionSignalRef.current.style.display = "none"
        }
      }

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
          ? selectedFill
          : cssColor(item.color, item.size < 2 ? 0.72 : 0.9)
        context.fill()
        if (selected) {
          context.lineWidth = 2
          context.strokeStyle = selectedStroke
          context.stroke()
        }
      }
    }
    renderRef.current = render
    const syncThemeColors = () => {
      const computedStyle = window.getComputedStyle(canvas)
      selectedFill =
        computedStyle.getPropertyValue("--atlas-selected-fill").trim() ||
        "#f5f3ec"
      selectedStroke =
        computedStyle.getPropertyValue("--atlas-selected-stroke").trim() ||
        "#101012"
      render()
    }
    window.addEventListener(THEME_CHANGE_EVENT, syncThemeColors)
    syncThemeColors()

    const animate = (time: number) => {
      animationFrame = null
      if (disposed || !visible) return
      if (time - lastFrame >= 30) {
        lastFrame = time
        if (
          !dragRef.current &&
          !pinchRef.current &&
          !selectedRef.current &&
          !hoveringRef.current
        ) {
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

    start()

    return () => {
      disposed = true
      renderRef.current = null
      window.removeEventListener(THEME_CHANGE_EVENT, syncThemeColors)
      intersectionObserver.disconnect()
      stop()
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleWheel = (event: globalThis.WheelEvent) => {
      event.preventDefault()
      const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY
      applyZoom(zoomRef.current * Math.exp(-delta * 0.0018))
    }

    canvas.addEventListener("wheel", handleWheel, { passive: false })
    return () => canvas.removeEventListener("wheel", handleWheel)
  }, [applyZoom])

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

  const pointerDistance = () => {
    const points = Array.from(activePointersRef.current.values())
    if (points.length < 2) return null
    return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y)
  }

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    activePointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    })
    event.currentTarget.setPointerCapture(event.pointerId)

    const distance = pointerDistance()
    if (distance !== null) {
      pinchRef.current = { distance, zoom: zoomRef.current }
      dragRef.current = null
      clearHover()
      renderRef.current?.()
      return
    }

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
  }

  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (activePointersRef.current.has(event.pointerId)) {
      activePointersRef.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      })
    }

    const pinch = pinchRef.current
    if (pinch) {
      const distance = pointerDistance()
      if (distance !== null && pinch.distance > 0) {
        const requestedZoom = pinch.zoom * (distance / pinch.distance)
        applyZoom(requestedZoom)
        if (requestedZoom !== zoomRef.current) {
          pinchRef.current = { distance, zoom: zoomRef.current }
        }
      }
      return
    }

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

  const handlePointerEnd = (
    event: PointerEvent<HTMLCanvasElement>,
    cancelled = false
  ) => {
    const wasPinching = pinchRef.current !== null
    const drag = dragRef.current
    activePointersRef.current.delete(event.pointerId)

    if (wasPinching) {
      dragRef.current = null
      const remainingDistance = pointerDistance()
      if (remainingDistance !== null) {
        pinchRef.current = {
          distance: remainingDistance,
          zoom: zoomRef.current,
        }
      } else {
        pinchRef.current = null
        const remainingPointer = activePointersRef.current
          .entries()
          .next().value
        if (remainingPointer) {
          const [pointerId, point] = remainingPointer
          dragRef.current = {
            pointerId,
            x: point.x,
            y: point.y,
            latitude: centerRef.current.latitude,
            longitude: centerRef.current.longitude,
            moved: true,
          }
        }
      }
    } else if (drag?.pointerId === event.pointerId) {
      dragRef.current = null
    }

    if (!wasPinching && !cancelled && drag && !drag.moved) {
      const nearest = findNearestLanguage(event.clientX, event.clientY)
      onSelect(nearest?.language ?? null)
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLCanvasElement>) => {
    if (event.key === "+" || event.key === "=") {
      event.preventDefault()
      applyZoom(zoomRef.current * ZOOM_STEP)
      return
    }
    if (event.key === "-" || event.key === "_") {
      event.preventDefault()
      applyZoom(zoomRef.current / ZOOM_STEP)
      return
    }
    if (event.key === "0") {
      event.preventDefault()
      applyZoom(MIN_ZOOM)
      return
    }

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
    <>
      <div className={styles.globeWrap}>
        <div ref={zoomLayerRef} className={styles.globeZoomLayer}>
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
            <g
              ref={selectionSignalRef}
              className={styles.selectionSignal}
              style={{ display: "none" }}
            >
              <circle r="12" />
              <circle r="26" />
              <circle r="44" />
              <path d="M-58 0H58M0-58V58" />
            </g>
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
            aria-label="Interactive vector globe of world languages. Drag or use arrow keys to rotate; pinch, scroll, or use plus and minus keys to zoom; hover a country for its name; select a language location for details."
            onKeyDown={handleKeyDown}
            onPointerCancel={(event) => handlePointerEnd(event, true)}
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
                  : "No indexed coverage"}
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
            </div>
          ) : null}
        </div>
      </div>
      <div className={styles.zoomControls} aria-label="Map zoom controls">
        <button
          type="button"
          aria-label="Zoom in"
          title="Zoom in"
          onClick={() => applyZoom(zoomRef.current * ZOOM_STEP)}
        >
          +
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          title="Zoom out"
          onClick={() => applyZoom(zoomRef.current / ZOOM_STEP)}
        >
          −
        </button>
      </div>
    </>
  )
}
