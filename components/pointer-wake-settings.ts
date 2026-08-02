export type PointerWakeSettings = Readonly<{
  accent: number
  density: number
  opacity: number
  radius: number
  trail: number
  turbulence: number
}>

export const DEFAULT_POINTER_WAKE_SETTINGS: PointerWakeSettings = {
  accent: 0.05,
  density: 0.73,
  opacity: 0.42,
  radius: 7.2,
  trail: 0.97,
  turbulence: 0.87,
}
