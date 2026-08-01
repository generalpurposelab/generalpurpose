"use client"

import createGlobe from "cobe"
import {
  useEffect,
  useRef,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react"

const GLOBE_SIZE = 560
const INITIAL_PHI = 3.32
const INITIAL_THETA = 0.04

const WORLD_CITIES = [
  { id: "pg-sf", location: [37.78, -122.44], label: "San Francisco" },
  { id: "pg-nyc", location: [40.71, -74.01], label: "New York" },
  { id: "pg-london", location: [51.51, -0.13], label: "London" },
  { id: "pg-tokyo", location: [35.68, 139.65], label: "Tokyo" },
  { id: "pg-sydney", location: [-33.87, 151.21], label: "Sydney" },
  { id: "pg-singapore", location: [1.35, 103.82], label: "Singapore" },
  { id: "pg-dubai", location: [25.2, 55.27], label: "Dubai" },
  { id: "pg-saopaulo", location: [-23.55, -46.63], label: "São Paulo" },
  { id: "pg-capetown", location: [-33.92, 18.42], label: "Cape Town" },
] as const

const WORLD_CITY_ARCS = [
  {
    id: "pg-sf-tokyo",
    from: [37.78, -122.44],
    to: [35.68, 139.65],
  },
  {
    id: "pg-nyc-london",
    from: [40.71, -74.01],
    to: [51.51, -0.13],
  },
  {
    id: "pg-london-dubai",
    from: [51.51, -0.13],
    to: [25.2, 55.27],
  },
] as const

type MarkerLabelStyle = CSSProperties & {
  "--city-visible": string
  positionAnchor: string
}

export function CanopyGlobe() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const phiRef = useRef(INITIAL_PHI)
  const thetaRef = useRef(INITIAL_THETA)
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
    const globe = createGlobe(canvas, {
      devicePixelRatio,
      width: GLOBE_SIZE,
      height: GLOBE_SIZE,
      phi: phiRef.current,
      theta: thetaRef.current,
      dark: 0,
      diffuse: 3,
      mapSamples: 23_000,
      mapBrightness: 2,
      mapBaseBrightness: 0,
      baseColor: [1, 1, 1],
      markerColor: [0.1, 0.1, 0.1],
      glowColor: [1, 1, 1],
      scale: 1.15,
      offset: [-10, 0],
      markerElevation: 0.02,
      markers: WORLD_CITIES.map(({ id, location }) => ({
        id,
        location: [...location],
        size: 0.045,
      })),
      arcs: WORLD_CITY_ARCS.map(({ id, from, to }) => ({
        id,
        from: [...from],
        to: [...to],
      })),
      arcColor: [0.3, 0.5, 1],
      arcHeight: 0.3,
      arcWidth: 0.4,
    })

    let animationFrame = 0
    const animate = () => {
      if (!reducedMotion && !dragRef.current) {
        phiRef.current += 0.003
      }

      globe.update({
        phi: phiRef.current,
        theta: thetaRef.current,
      })
      animationFrame = window.requestAnimationFrame(animate)
    }

    animationFrame = window.requestAnimationFrame(animate)

    return () => {
      window.cancelAnimationFrame(animationFrame)
      globe.destroy()
    }
  }, [])

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
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
  }

  return (
    <div className="canopy-globe-wrap">
      <canvas
        ref={canvasRef}
        className="canopy-globe-canvas"
        role="img"
        aria-label="Interactive Canopy globe with world cities and routes. Drag or use the arrow keys to rotate."
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      />
      <div aria-hidden="true">
        {WORLD_CITIES.map(({ id, label }) => {
          const visibility = `var(--cobe-visible-${id}, 0)`
          const style: MarkerLabelStyle = {
            "--city-visible": visibility,
            positionAnchor: `--cobe-${id}`,
            opacity: visibility,
          }

          return (
            <span className="canopy-city-label" key={id} style={style}>
              {label}
            </span>
          )
        })}
      </div>
    </div>
  )
}
