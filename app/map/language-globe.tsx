"use client"

import type { Globe, Marker } from "cobe"
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react"

import { loadCobe } from "@/components/canopy-globe-loader"
import { THEME_CHANGE_EVENT } from "@/components/theme-toggle"

import type { AtlasLanguage, AtlasResource } from "./atlas-types"
import styles from "./map.module.css"

const INITIAL_PHI = 3.05
const INITIAL_THETA = 0.08
const SCALE = 1.08
const MARKER_ELEVATION = 0.018
const MARKER_RADIUS = 0.8 + MARKER_ELEVATION

type Color = [number, number, number]

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
    return { color: [0.16, 0.39, 0.95] as Color, size: 0.012 }
  }
  if (domains.speech) return { color: [0.76, 0.22, 0.64] as Color, size: 0.009 }
  if (domains.translation) {
    return { color: [0.96, 0.46, 0.16] as Color, size: 0.009 }
  }
  if (domains.text) return { color: [0.14, 0.64, 0.43] as Color, size: 0.008 }
  return { color: [0.49, 0.52, 0.55] as Color, size: 0.0035 }
}

function locationVector(latitude: number, longitude: number) {
  const lat = (latitude * Math.PI) / 180
  const lon = (longitude * Math.PI) / 180 - Math.PI
  const cosLat = Math.cos(lat)
  return [-cosLat * Math.cos(lon), Math.sin(lat), cosLat * Math.sin(lon)]
}

function projectLocation(
  language: AtlasLanguage,
  phi: number,
  theta: number,
  width: number,
  height: number
): ProjectedPoint | null {
  if (language.latitude === null || language.longitude === null) return null
  const [rawX, rawY, rawZ] = locationVector(
    language.latitude,
    language.longitude
  )
  const x = rawX * MARKER_RADIUS
  const y = rawY * MARKER_RADIUS
  const z = rawZ * MARKER_RADIUS
  const cosTheta = Math.cos(theta)
  const cosPhi = Math.cos(phi)
  const sinTheta = Math.sin(theta)
  const sinPhi = Math.sin(phi)
  const horizontal = cosPhi * x + sinPhi * z
  const vertical = sinPhi * sinTheta * x + cosTheta * y - cosPhi * sinTheta * z
  const depth = -sinPhi * cosTheta * x + sinTheta * y + cosPhi * cosTheta * z

  return {
    x: ((horizontal / (width / height)) * SCALE + 1) / 2,
    y: (-vertical * SCALE + 1) / 2,
    visible:
      depth >= 0 || horizontal * horizontal + vertical * vertical >= 0.64,
  }
}

function focusAngles(language: AtlasLanguage) {
  if (language.latitude === null || language.longitude === null) return null
  const [x, y, z] = locationVector(language.latitude, language.longitude)
  const phi = Math.atan2(-x, z)
  const theta = Math.atan2(y, Math.hypot(x, z))
  return { phi, theta }
}

function isDarkTheme() {
  return document.documentElement.dataset.theme === "dark"
}

function globeColors(dark: boolean) {
  return {
    dark: dark ? 1 : 0,
    baseColor: (dark ? [0.34, 0.36, 0.39] : [0.95, 0.95, 0.92]) as Color,
    glowColor: (dark ? [0.04, 0.05, 0.07] : [0.97, 0.97, 0.94]) as Color,
    mapBrightness: dark ? 4.5 : 2.1,
  }
}

export function LanguageGlobe({
  languages,
  resources,
  selectedLanguage,
  onSelect,
}: LanguageGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const globeRef = useRef<Globe | null>(null)
  const phiRef = useRef(INITIAL_PHI)
  const thetaRef = useRef(INITIAL_THETA)
  const sizeRef = useRef({ width: 720, height: 720 })
  const renderRef = useRef<(() => void) | null>(null)
  const languagesRef = useRef(languages)
  const selectedRef = useRef(selectedLanguage)
  const dragRef = useRef<{
    pointerId: number
    x: number
    y: number
    phi: number
    theta: number
    moved: boolean
  } | null>(null)
  const hoverFrameRef = useRef<number | null>(null)
  const pendingPointerRef = useRef<{ x: number; y: number } | null>(null)
  const [hoveredLanguage, setHoveredLanguage] = useState<AtlasLanguage | null>(
    null
  )
  const [hoverPoint, setHoverPoint] = useState<ProjectedPoint | null>(null)

  const markers = useMemo<Marker[]>(
    () =>
      languages.flatMap((language) => {
        if (language.latitude === null || language.longitude === null) return []
        const appearance = markerStyle(language, resources)
        const selected = selectedLanguage?.id === language.id
        return [
          {
            location: [language.latitude, language.longitude],
            color: selected ? ([0.04, 0.05, 0.08] as Color) : appearance.color,
            size: selected ? 0.032 : appearance.size,
          },
        ]
      }),
    [languages, resources, selectedLanguage]
  )
  const markersRef = useRef(markers)

  useEffect(() => {
    languagesRef.current = languages
  }, [languages])

  useEffect(() => {
    selectedRef.current = selectedLanguage
    if (!selectedLanguage) return
    const angles = focusAngles(selectedLanguage)
    if (!angles) return
    phiRef.current = angles.phi
    thetaRef.current = angles.theta
    renderRef.current?.()
  }, [selectedLanguage])

  useEffect(() => {
    markersRef.current = markers
    globeRef.current?.update({ markers })
    renderRef.current?.()
  }, [markers])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2)
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
    let disposed = false
    let animationFrame: number | null = null
    let visible = true

    const render = () => {
      globeRef.current?.update({
        phi: phiRef.current,
        theta: thetaRef.current,
      })
    }
    renderRef.current = render

    const animate = () => {
      animationFrame = null
      if (!dragRef.current && !selectedRef.current) phiRef.current += 0.0015
      render()
      if (visible) animationFrame = window.requestAnimationFrame(animate)
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

    const resizeObserver = new ResizeObserver(([entry]) => {
      const width = Math.max(1, Math.round(entry.contentRect.width))
      const height = Math.max(1, Math.round(entry.contentRect.height))
      sizeRef.current = { width, height }
      globeRef.current?.update({ width, height })
      render()
    })
    resizeObserver.observe(canvas)

    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible) {
        render()
        start()
      } else {
        stop()
      }
    })
    intersectionObserver.observe(canvas)

    const initialize = async () => {
      const { default: createGlobe } = await loadCobe()
      if (disposed) return
      const bounds = canvas.getBoundingClientRect()
      const width = Math.max(1, Math.round(bounds.width || 720))
      const height = Math.max(1, Math.round(bounds.height || 720))
      sizeRef.current = { width, height }
      globeRef.current = createGlobe(canvas, {
        devicePixelRatio,
        width,
        height,
        phi: phiRef.current,
        theta: thetaRef.current,
        diffuse: 2.8,
        mapSamples: width < 520 ? 12_000 : 22_000,
        mapBaseBrightness: 0,
        markerColor: [0.45, 0.48, 0.52],
        markerElevation: MARKER_ELEVATION,
        markers: markersRef.current,
        opacity: 0.96,
        scale: SCALE,
        ...globeColors(isDarkTheme()),
      })
      render()
      start()
    }

    const handleThemeChange = () => {
      globeRef.current?.update(globeColors(isDarkTheme()))
      render()
    }
    window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange)

    void initialize().catch((error: unknown) => {
      if (!disposed) console.error("Unable to initialize language globe", error)
    })

    return () => {
      disposed = true
      renderRef.current = null
      window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange)
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      stop()
      globeRef.current?.destroy()
      globeRef.current = null
    }
  }, [])

  const findNearestLanguage = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const bounds = canvas.getBoundingClientRect()
    const localX = clientX - bounds.left
    const localY = clientY - bounds.top
    let nearest: {
      language: AtlasLanguage
      point: ProjectedPoint
      distance: number
    } | null = null

    for (const language of languagesRef.current) {
      const point = projectLocation(
        language,
        phiRef.current,
        thetaRef.current,
        bounds.width,
        bounds.height
      )
      if (!point?.visible) continue
      const dx = point.x * bounds.width - localX
      const dy = point.y * bounds.height - localY
      const distance = Math.hypot(dx, dy)
      if (distance <= 13 && (!nearest || distance < nearest.distance)) {
        nearest = { language, point, distance }
      }
    }
    return nearest
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
    })
  }

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      phi: phiRef.current,
      theta: thetaRef.current,
      moved: false,
    }
    setHoveredLanguage(null)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) {
      scheduleHover(event.clientX, event.clientY)
      return
    }
    const dx = event.clientX - drag.x
    const dy = event.clientY - drag.y
    if (Math.hypot(dx, dy) > 4) drag.moved = true
    phiRef.current = drag.phi + dx / 170
    thetaRef.current = Math.max(-1.2, Math.min(1.2, drag.theta + dy / 310))
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
      ArrowLeft: [-0.13, 0],
      ArrowRight: [0.13, 0],
      ArrowUp: [0, -0.1],
      ArrowDown: [0, 0.1],
    }
    const adjustment = adjustments[event.key]
    if (!adjustment) return
    event.preventDefault()
    onSelect(null)
    phiRef.current += adjustment[0]
    thetaRef.current = Math.max(
      -1.2,
      Math.min(1.2, thetaRef.current + adjustment[1])
    )
    renderRef.current?.()
  }

  return (
    <div className={styles.globeWrap}>
      <canvas
        ref={canvasRef}
        className={styles.globeCanvas}
        width={720}
        height={720}
        role="img"
        tabIndex={0}
        aria-label="Interactive globe of world languages. Drag or use arrow keys to rotate; select a point for language details."
        onKeyDown={handleKeyDown}
        onPointerCancel={handlePointerEnd}
        onPointerDown={handlePointerDown}
        onPointerLeave={() => {
          setHoveredLanguage(null)
          setHoverPoint(null)
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
      ) : null}
      <div className={styles.globeHint}>Drag to rotate · select a point</div>
    </div>
  )
}
