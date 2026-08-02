import { useEffect, useRef } from "react"

import {
  emitPointerWake,
  randomWakeAccent,
  WAKE_DIRECTION_VECTORS,
  type WakeAccent,
} from "@/components/pointer-wake-engine"
import {
  DEFAULT_POINTER_WAKE_SETTINGS,
  type PointerWakeSettings,
} from "@/components/pointer-wake-settings"

export type PagePointerWakeSettings = PointerWakeSettings
export const DEFAULT_PAGE_POINTER_WAKE_SETTINGS = DEFAULT_POINTER_WAKE_SETTINGS

type PointerWakeSetting = keyof PagePointerWakeSettings

type PointerControl = Readonly<{
  format: (value: number) => string
  key: PointerWakeSetting
  label: string
  max: number
  min: number
  step: number
}>

type WakeDot = {
  accent: WakeAccent
  alpha: number
  column: number
  direction: number
  nextStep: number
  propagated: boolean
  row: number
}

const GRID_PITCH = 4.484
const DOT_RADIUS = 0.71
const MAX_ACTIVE_DOTS = 600
const ALPHA_CUTOFF = 0.006
const ACCENT_ALPHA_BOOST = 4
const POINTER_CONTROLS: readonly PointerControl[] = [
  {
    key: "opacity",
    label: "Opacity",
    min: 0.06,
    max: 0.55,
    step: 0.01,
    format: (value) => `${Math.round(value * 100)}%`,
  },
  {
    key: "accent",
    label: "Accent",
    min: 0,
    max: 0.3,
    step: 0.01,
    format: (value) => `${Math.round(value * 100)}%`,
  },
  {
    key: "radius",
    label: "Radius",
    min: 1.5,
    max: 10,
    step: 0.1,
    format: (value) => `${value.toFixed(1)}×`,
  },
  {
    key: "density",
    label: "Density",
    min: 0.08,
    max: 1,
    step: 0.01,
    format: (value) => value.toFixed(2),
  },
  {
    key: "turbulence",
    label: "Turbulence",
    min: 0,
    max: 1,
    step: 0.01,
    format: (value) => value.toFixed(2),
  },
  {
    key: "trail",
    label: "Trail",
    min: 0.75,
    max: 0.99,
    step: 0.01,
    format: (value) => value.toFixed(2),
  },
]

function wakeKey(column: number, row: number) {
  return `${column}:${row}`
}

export function PagePointerWakeTuner({
  enabled,
  onChange,
  onEnabledChange,
  onReset,
  settings,
}: {
  enabled: boolean
  onChange: (setting: PointerWakeSetting, value: number) => void
  onEnabledChange: (enabled: boolean) => void
  onReset: () => void
  settings: PagePointerWakeSettings
}) {
  return (
    <aside
      className="pointer-wake-tuner"
      aria-label="Page pointer wake controls"
    >
      <div className="pointer-wake-tuner-header">
        <span>Pointer wake</span>
        <button
          className="pointer-wake-tuner-reset"
          onClick={onReset}
          type="button"
        >
          Reset
        </button>
      </div>

      <div className="pointer-wake-tuner-controls">
        {POINTER_CONTROLS.map((control) => {
          const value = settings[control.key]

          return (
            <label className="pointer-wake-tuner-control" key={control.key}>
              <span className="pointer-wake-tuner-control-label">
                <span>{control.label}</span>
                <output>{control.format(value)}</output>
              </span>
              <input
                aria-label={control.label}
                max={control.max}
                min={control.min}
                onChange={(event) =>
                  onChange(control.key, event.currentTarget.valueAsNumber)
                }
                step={control.step}
                type="range"
                value={value}
              />
            </label>
          )
        })}
      </div>

      <label className="pointer-wake-tuner-toggle">
        <span>Page wake</span>
        <input
          checked={enabled}
          onChange={(event) => onEnabledChange(event.currentTarget.checked)}
          type="checkbox"
        />
        <span className="pointer-wake-tuner-switch" aria-hidden="true" />
      </label>
    </aside>
  )
}

export function PagePointerWake({
  enabled,
  settings,
}: {
  enabled: boolean
  settings: PagePointerWakeSettings
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext("2d")
    if (!canvas || !context || !enabled) return

    const activeDots = new Map<string, WakeDot>()
    const rootStyles = window.getComputedStyle(document.documentElement)
    const orangeAccent =
      rootStyles.getPropertyValue("--accent-color").trim() || "#fd7804"
    const blueAccent =
      rootStyles.getPropertyValue("--accent-blue-color").trim() || "#016efd"
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
    let frame: number | null = null
    let lastFrame = performance.now()
    let lastPointer: { x: number; y: number } | null = null
    let viewportWidth = window.innerWidth
    let viewportHeight = window.innerHeight
    let gridOriginX = GRID_PITCH / 2
    let gridOriginY = GRID_PITCH / 2

    const alignToIdentityGrid = () => {
      const identityGrid = document.querySelector<HTMLElement>(".identity-grid")
      if (!identityGrid) return

      const bounds = identityGrid.getBoundingClientRect()
      gridOriginX = bounds.left + DOT_RADIUS
      gridOriginY = bounds.top + DOT_RADIUS
    }

    const resizeCanvas = () => {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
      viewportWidth = window.innerWidth
      viewportHeight = window.innerHeight
      canvas.width = Math.round(viewportWidth * pixelRatio)
      canvas.height = Math.round(viewportHeight * pixelRatio)
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      alignToIdentityGrid()
    }

    const addWakeDot = (
      column: number,
      row: number,
      alpha: number,
      direction: number,
      accent: WakeDot["accent"],
      now: number
    ) => {
      const x = gridOriginX + column * GRID_PITCH
      const y = gridOriginY + row * GRID_PITCH
      if (x < 0 || x > viewportWidth || y < 0 || y > viewportHeight) return

      const key = wakeKey(column, row)
      const existing = activeDots.get(key)

      if (existing) {
        if (alpha > existing.alpha) {
          existing.alpha = alpha
          existing.direction = direction
          existing.accent ||= accent
          existing.nextStep = now + 28 + Math.random() * 58
          existing.propagated = false
        }
        return
      }

      if (activeDots.size >= MAX_ACTIVE_DOTS) return

      activeDots.set(key, {
        accent,
        alpha,
        column,
        direction,
        nextStep: now + 28 + Math.random() * 58,
        propagated: false,
        row,
      })
    }

    const emitWake = (
      x: number,
      y: number,
      deltaX: number,
      deltaY: number,
      now: number
    ) => {
      emitPointerWake({
        deltaX,
        deltaY,
        emit: (dotX, dotY, alpha, direction) => {
          addWakeDot(
            Math.round((dotX - gridOriginX) / GRID_PITCH),
            Math.round((dotY - gridOriginY) / GRID_PITCH),
            alpha,
            direction,
            randomWakeAccent(settings.accent),
            now
          )
        },
        pitch: GRID_PITCH,
        settings,
        x,
        y,
      })
    }

    const renderWake = (now: number) => {
      const elapsedFrames = Math.min(4, (now - lastFrame) / (1000 / 60))
      const decay = reducedMotion
        ? 0.9
        : Math.pow(settings.trail, elapsedFrames)
      lastFrame = now
      context.clearRect(0, 0, viewportWidth, viewportHeight)
      let activeColor = ""

      for (const [key, dot] of Array.from(activeDots.entries())) {
        dot.alpha *= decay

        if (dot.alpha <= ALPHA_CUTOFF) {
          activeDots.delete(key)
          continue
        }

        if (
          !reducedMotion &&
          !dot.propagated &&
          now >= dot.nextStep &&
          dot.alpha > settings.opacity * 0.12
        ) {
          dot.propagated = true
          const turnChance = settings.turbulence
          const turn =
            Math.random() < turnChance ? (Math.random() < 0.5 ? -1 : 1) : 0
          const nextDirection = (dot.direction + turn + 8) % 8
          const [columnStep, rowStep] = WAKE_DIRECTION_VECTORS[nextDirection]

          addWakeDot(
            dot.column + columnStep,
            dot.row + rowStep,
            dot.alpha * (0.62 + settings.density * 0.22),
            nextDirection,
            dot.accent !== 0 && Math.random() < 0.72 ? dot.accent : 0,
            now
          )
        }

        const dotColor =
          dot.accent === 1
            ? orangeAccent
            : dot.accent === 2
              ? blueAccent
              : "#8f8f8f"
        if (dotColor !== activeColor) {
          context.fillStyle = dotColor
          activeColor = dotColor
        }
        const opacityBoost = dot.accent === 0 ? 1 : ACCENT_ALPHA_BOOST
        context.globalAlpha = Math.min(
          settings.opacity * opacityBoost,
          dot.alpha * opacityBoost
        )
        context.beginPath()
        context.arc(
          gridOriginX + dot.column * GRID_PITCH,
          gridOriginY + dot.row * GRID_PITCH,
          DOT_RADIUS,
          0,
          Math.PI * 2
        )
        context.fill()
      }

      context.globalAlpha = 1

      if (activeDots.size > 0) {
        frame = window.requestAnimationFrame(renderWake)
      } else {
        frame = null
      }
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return

      const target = event.target
      const isOverExcludedSurface =
        target instanceof Element &&
        Boolean(
          target.closest(
            '.identity-grid, .pointer-wake-tuner, .tagline, .team-list li, .writing-row, a[href="/join"]'
          )
        )

      if (isOverExcludedSurface) {
        lastPointer = null
        return
      }

      const previous = lastPointer ?? { x: event.clientX, y: event.clientY }
      const now = performance.now()
      emitWake(
        event.clientX,
        event.clientY,
        event.clientX - previous.x,
        event.clientY - previous.y,
        now
      )
      lastPointer = { x: event.clientX, y: event.clientY }

      if (frame === null && activeDots.size > 0) {
        lastFrame = now
        frame = window.requestAnimationFrame(renderWake)
      }
    }

    const resetPointer = () => {
      lastPointer = null
    }

    const handlePointerOut = (event: PointerEvent) => {
      if (!event.relatedTarget) resetPointer()
    }

    const handleScroll = () => {
      alignToIdentityGrid()
      activeDots.clear()
      context.clearRect(0, 0, viewportWidth, viewportHeight)
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)
    window.addEventListener("scroll", handleScroll, { passive: true })
    window.addEventListener("pointermove", handlePointerMove, { passive: true })
    window.addEventListener("pointerout", handlePointerOut, { passive: true })
    window.addEventListener("blur", resetPointer)

    return () => {
      window.removeEventListener("resize", resizeCanvas)
      window.removeEventListener("scroll", handleScroll)
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerout", handlePointerOut)
      window.removeEventListener("blur", resetPointer)
      if (frame !== null) window.cancelAnimationFrame(frame)
      context.clearRect(0, 0, viewportWidth, viewportHeight)
    }
  }, [enabled, settings])

  return (
    <canvas
      className="page-pointer-wake"
      aria-hidden="true"
      data-enabled={enabled || undefined}
      ref={canvasRef}
    />
  )
}
