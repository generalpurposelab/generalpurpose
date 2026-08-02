import type { PointerWakeSettings } from "@/components/pointer-wake-settings"

export type WakeAccent = 0 | 1 | 2

export const WAKE_DIRECTION_VECTORS = [
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [1, -1],
] as const

export function directionFromAngle(angle: number) {
  const direction = Math.round(angle / (Math.PI / 4))
  return ((direction % 8) + 8) % 8
}

export function randomWakeAccent(accentChance: number): WakeAccent {
  if (Math.random() >= accentChance) return 0
  return Math.random() < 0.5 ? 1 : 2
}

export function emitPointerWake({
  deltaX,
  deltaY,
  emit,
  pitch,
  settings,
  x,
  y,
}: {
  deltaX: number
  deltaY: number
  emit: (x: number, y: number, alpha: number, direction: number) => void
  pitch: number
  settings: PointerWakeSettings
  x: number
  y: number
}) {
  const distance = Math.hypot(deltaX, deltaY)
  const movementAngle =
    distance > 0.1 ? Math.atan2(deltaY, deltaX) : Math.random() * Math.PI * 2
  const directionX = Math.cos(movementAngle)
  const directionY = Math.sin(movementAngle)
  const perpendicularX = -directionY
  const perpendicularY = directionX
  const sampleCount = Math.min(
    12,
    Math.max(1, Math.ceil(distance / (pitch * 0.7)))
  )
  const attemptsPerSample = Math.max(
    2,
    Math.round(settings.radius * settings.density * 1.7)
  )
  const brushRadius = pitch * settings.radius

  for (let sample = 0; sample < sampleCount; sample += 1) {
    const progress = (sample + 1) / sampleCount
    const sampleX = x - deltaX * (1 - progress)
    const sampleY = y - deltaY * (1 - progress)

    for (let attempt = 0; attempt < attemptsPerSample; attempt += 1) {
      const behind = Math.random() * brushRadius
      const lateral =
        (Math.random() - Math.random()) *
        brushRadius *
        (0.25 + settings.turbulence * 0.75)
      const jitter =
        (Math.random() - 0.5) * brushRadius * settings.turbulence * 0.35
      const dotX =
        sampleX - directionX * behind + perpendicularX * lateral + jitter
      const dotY =
        sampleY - directionY * behind + perpendicularY * lateral + jitter
      const falloff = Math.max(
        0,
        1 - Math.hypot(behind, lateral) / (brushRadius * 1.25)
      )
      if (Math.random() > settings.density * (0.45 + falloff * 0.8)) continue

      const directionAngle =
        movementAngle +
        Math.PI +
        (Math.random() - 0.5) * Math.PI * 2 * settings.turbulence
      const alphaVariation = 0.7 + Math.random() * 0.3
      const radialOpacity = 0.45 + falloff * 0.55

      emit(
        dotX,
        dotY,
        settings.opacity * alphaVariation * radialOpacity,
        directionFromAngle(directionAngle)
      )
    }
  }
}
