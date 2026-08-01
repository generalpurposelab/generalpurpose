"use client"

import { useEffect, useMemo, useRef, type CSSProperties } from "react"

import {
  PRODUCT_DOT_SCALES,
  type IdentityPattern,
} from "@/components/gp-product-scales"

type DotStyle = CSSProperties & {
  "--dot-delay": string
  "--dot-pointer-scale": number
  "--dot-scale": number
}

type GridStyle = CSSProperties & {
  "--identity-dot-gap": string
  "--identity-dot-size": string
  "--identity-grid-columns": number
}

const SOURCE_GRID_COLUMNS = 30
const GRID_SIZE = 104.56
const DOT_SIZE = 1.422
const POINTER_PEAK_SCALE = 1.65

function resampleDotScales(source: readonly number[], resolution: number) {
  if (resolution === SOURCE_GRID_COLUMNS) return Array.from(source)

  const scales: number[] = []
  const sourceSpan = SOURCE_GRID_COLUMNS - 1
  const targetSpan = resolution - 1

  for (let row = 0; row < resolution; row += 1) {
    const sourceRow = (row / targetSpan) * sourceSpan
    const top = Math.floor(sourceRow)
    const bottom = Math.min(top + 1, sourceSpan)
    const verticalMix = sourceRow - top

    for (let column = 0; column < resolution; column += 1) {
      const sourceColumn = (column / targetSpan) * sourceSpan
      const left = Math.floor(sourceColumn)
      const right = Math.min(left + 1, sourceSpan)
      const horizontalMix = sourceColumn - left
      const topLeft = source[top * SOURCE_GRID_COLUMNS + left]
      const topRight = source[top * SOURCE_GRID_COLUMNS + right]
      const bottomLeft = source[bottom * SOURCE_GRID_COLUMNS + left]
      const bottomRight = source[bottom * SOURCE_GRID_COLUMNS + right]
      const topScale = topLeft + (topRight - topLeft) * horizontalMix
      const bottomScale =
        bottomLeft + (bottomRight - bottomLeft) * horizontalMix

      scales.push(topScale + (bottomScale - topScale) * verticalMix)
    }
  }

  return scales
}

export function IdentityGrid({
  pattern,
  resolution = SOURCE_GRID_COLUMNS,
}: {
  pattern: IdentityPattern | null
  resolution?: number
}) {
  const gridRef = useRef<HTMLSpanElement>(null)
  const dotSize = DOT_SIZE
  const dotGap = (GRID_SIZE - resolution * dotSize) / (resolution - 1)
  const dotPitch = dotSize + dotGap
  const pointerRadius = dotPitch * 2.4
  const pointerRange = Math.ceil(pointerRadius / dotPitch)
  const scales = useMemo(
    () =>
      pattern
        ? resampleDotScales(PRODUCT_DOT_SCALES[pattern], resolution)
        : Array.from({ length: resolution * resolution }, () => 1),
    [pattern, resolution]
  )
  const gridStyle: GridStyle = {
    "--identity-dot-gap": `${dotGap}px`,
    "--identity-dot-size": `${dotSize}px`,
    "--identity-grid-columns": resolution,
  }

  useEffect(() => {
    const grid = gridRef.current
    if (!grid) return

    const dots = Array.from(grid.children) as HTMLSpanElement[]
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
    const followStrength = reducedMotion ? 1 : 0.28
    let activeDots = new Set<number>()
    let frame: number | null = null
    let settleTimer: number | null = null
    let pointerIsInside = false
    let pointerX = 0
    let pointerY = 0
    let targetX = 0
    let targetY = 0

    const renderPointerField = () => {
      pointerX += (targetX - pointerX) * followStrength
      pointerY += (targetY - pointerY) * followStrength

      const pointerColumn = (pointerX - dotSize / 2) / dotPitch
      const pointerRow = (pointerY - dotSize / 2) / dotPitch
      const minColumn = Math.max(0, Math.floor(pointerColumn - pointerRange))
      const maxColumn = Math.min(
        resolution - 1,
        Math.ceil(pointerColumn + pointerRange)
      )
      const minRow = Math.max(0, Math.floor(pointerRow - pointerRange))
      const maxRow = Math.min(
        resolution - 1,
        Math.ceil(pointerRow + pointerRange)
      )
      const nextActiveDots = new Set<number>()

      for (let row = minRow; row <= maxRow; row += 1) {
        for (let column = minColumn; column <= maxColumn; column += 1) {
          const index = row * resolution + column
          const dotX = column * dotPitch + dotSize / 2
          const dotY = row * dotPitch + dotSize / 2
          const distance = Math.hypot(dotX - pointerX, dotY - pointerY)

          if (distance >= pointerRadius) continue

          const proximity = 1 - distance / pointerRadius
          const liquidFalloff =
            proximity * proximity * (3 - 2 * proximity)
          const scale =
            1 + (POINTER_PEAK_SCALE - 1) * liquidFalloff

          dots[index].style.setProperty(
            "--dot-pointer-scale",
            scale.toFixed(3)
          )
          nextActiveDots.add(index)
        }
      }

      for (const index of activeDots) {
        if (!nextActiveDots.has(index)) {
          dots[index].style.setProperty("--dot-pointer-scale", "1")
        }
      }

      activeDots = nextActiveDots
      const isFollowing =
        Math.abs(targetX - pointerX) > 0.05 ||
        Math.abs(targetY - pointerY) > 0.05

      if (pointerIsInside && isFollowing) {
        frame = window.requestAnimationFrame(renderPointerField)
      } else {
        frame = null
      }
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return

      const bounds = grid.getBoundingClientRect()
      targetX = event.clientX - bounds.left
      targetY = event.clientY - bounds.top

      if (!pointerIsInside) {
        pointerX = targetX
        pointerY = targetY
      }

      pointerIsInside = true
      if (settleTimer !== null) window.clearTimeout(settleTimer)
      grid.classList.add("identity-grid--interactive")

      if (frame === null) {
        frame = window.requestAnimationFrame(renderPointerField)
      }
    }

    const handlePointerLeave = () => {
      pointerIsInside = false
      if (frame !== null) window.cancelAnimationFrame(frame)
      frame = null

      for (const index of activeDots) {
        dots[index].style.setProperty("--dot-pointer-scale", "1")
      }
      activeDots.clear()

      settleTimer = window.setTimeout(() => {
        grid.classList.remove("identity-grid--interactive")
        settleTimer = null
      }, reducedMotion ? 0 : 180)
    }

    grid.addEventListener("pointermove", handlePointerMove)
    grid.addEventListener("pointerleave", handlePointerLeave)
    grid.addEventListener("pointercancel", handlePointerLeave)

    return () => {
      grid.removeEventListener("pointermove", handlePointerMove)
      grid.removeEventListener("pointerleave", handlePointerLeave)
      grid.removeEventListener("pointercancel", handlePointerLeave)
      if (frame !== null) window.cancelAnimationFrame(frame)
      if (settleTimer !== null) window.clearTimeout(settleTimer)
    }
  }, [dotPitch, dotSize, pointerRadius, pointerRange, resolution])

  return (
    <span
      className="identity-grid"
      aria-hidden="true"
      ref={gridRef}
      style={gridStyle}
    >
      {scales.map((scale, index) => {
        const row = Math.floor(index / resolution)
        const column = index % resolution
        const center = (resolution - 1) / 2
        const distanceFromCenter = Math.hypot(row - center, column - center)
        const style: DotStyle = {
          "--dot-delay": `${Math.round(distanceFromCenter * 5)}ms`,
          "--dot-pointer-scale": 1,
          "--dot-scale": scale,
        }

        return <span className="identity-dot" key={index} style={style} />
      })}
    </span>
  )
}

export function IdentityWordmark() {
  return <span className="identity-wordmark" aria-hidden="true" />
}

export function GeneralPurposeIdentity({
  pattern = null,
  resolution = SOURCE_GRID_COLUMNS,
}: {
  pattern?: IdentityPattern | null
  resolution?: number
}) {
  return (
    <div
      className={`identity${pattern ? " identity--active" : ""}`}
      role="img"
      aria-label={`General Purpose, ${resolution} by ${resolution} dot grid`}
    >
      <IdentityGrid pattern={pattern} resolution={resolution} />
      <IdentityWordmark />
    </div>
  )
}
