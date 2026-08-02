import { mkdir, readFile, writeFile } from "node:fs/promises"
import { basename, dirname, join } from "node:path"

const OUTPUT_COLUMNS = 24
const RASTER_SIZE = 960
const TARGET_MAX_SCALE = 3.1
const QUANTIZATION_LEVELS = 64
const SCALE_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"
const COVERAGE_FLOOR = 0.02
const DARK_COVERAGE_PERCENTILE = 0.98
const TONE_GAMMA = 1.2
const GRID_SIZE = 104.56
const DOT_DIAMETER = 1.422

function parseArguments(arguments_) {
  const sources = []
  let output
  let previewDirectory

  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index]

    if (argument === "--output") {
      output = arguments_[index + 1]
      index += 1
      continue
    }

    if (argument === "--preview-dir") {
      previewDirectory = arguments_[index + 1]
      index += 1
      continue
    }

    const separator = argument.indexOf("=")
    if (separator === -1) {
      throw new Error(`Expected a name=path source, received ${argument}`)
    }

    const name = argument.slice(0, separator)
    const path = argument.slice(separator + 1)

    if (!/^[a-z][a-z0-9_]*$/.test(name) || !path) {
      throw new Error(`Invalid identity source ${argument}`)
    }

    sources.push({ name, path })
  }

  if (!output || sources.length === 0) {
    throw new Error(
      "Usage: node scripts/generate-identity-patterns.mjs --output <file> [--preview-dir <dir>] name=<source.svg> [...]"
    )
  }

  return { output, previewDirectory, sources }
}

function parseSvg(svg, path) {
  const viewBoxMatch = svg.match(/viewBox="([^"]+)"/)
  if (!viewBoxMatch) throw new Error(`${path} is missing an SVG viewBox`)

  const viewBox = viewBoxMatch[1].trim().split(/\s+/).map(Number)
  if (
    viewBox.length !== 4 ||
    viewBox.some((value) => !Number.isFinite(value))
  ) {
    throw new Error(`${path} has an invalid SVG viewBox`)
  }

  const circles = Array.from(
    svg.matchAll(/<circle\s+cx="([^"]+)"\s+cy="([^"]+)"\s+r="([^"]+)"/g),
    (match) => ({
      x: Number(match[1]),
      y: Number(match[2]),
      radius: Number(match[3]),
    })
  )

  if (
    circles.length === 0 ||
    circles.some(
      ({ x, y, radius }) =>
        !Number.isFinite(x) ||
        !Number.isFinite(y) ||
        !Number.isFinite(radius) ||
        radius <= 0
    )
  ) {
    throw new Error(`${path} does not contain valid circle stipples`)
  }

  return { circles, viewBox }
}

function rasterize({ circles, viewBox }) {
  const [viewBoxX, viewBoxY, viewBoxWidth, viewBoxHeight] = viewBox
  const scaleX = RASTER_SIZE / viewBoxWidth
  const scaleY = RASTER_SIZE / viewBoxHeight
  const raster = new Uint8Array(RASTER_SIZE * RASTER_SIZE)

  for (const circle of circles) {
    const centerX = (circle.x - viewBoxX) * scaleX
    const centerY = (circle.y - viewBoxY) * scaleY
    const radiusX = circle.radius * scaleX
    const radiusY = circle.radius * scaleY
    const minX = Math.max(0, Math.floor(centerX - radiusX))
    const maxX = Math.min(RASTER_SIZE - 1, Math.ceil(centerX + radiusX))
    const minY = Math.max(0, Math.floor(centerY - radiusY))
    const maxY = Math.min(RASTER_SIZE - 1, Math.ceil(centerY + radiusY))

    for (let y = minY; y <= maxY; y += 1) {
      const normalizedY = (y + 0.5 - centerY) / radiusY

      for (let x = minX; x <= maxX; x += 1) {
        const normalizedX = (x + 0.5 - centerX) / radiusX
        if (normalizedX ** 2 + normalizedY ** 2 <= 1) {
          raster[y * RASTER_SIZE + x] = 1
        }
      }
    }
  }

  return raster
}

function sampleCoverage(raster) {
  const cellSize = RASTER_SIZE / OUTPUT_COLUMNS
  const cellArea = cellSize ** 2
  const coverage = []

  for (let row = 0; row < OUTPUT_COLUMNS; row += 1) {
    for (let column = 0; column < OUTPUT_COLUMNS; column += 1) {
      let inkPixels = 0

      for (let y = row * cellSize; y < (row + 1) * cellSize; y += 1) {
        const rowOffset = y * RASTER_SIZE

        for (let x = column * cellSize; x < (column + 1) * cellSize; x += 1) {
          inkPixels += raster[rowOffset + x]
        }
      }

      coverage.push(inkPixels / cellArea)
    }
  }

  return coverage
}

function percentile(values, percentileValue) {
  const sorted = values.toSorted((left, right) => left - right)
  const index = Math.floor((sorted.length - 1) * percentileValue)
  return sorted[index]
}

function coverageToScales(coverage) {
  const nonEmptyCoverage = coverage.filter((value) => value > COVERAGE_FLOOR)
  const darkCoverage = percentile(nonEmptyCoverage, DARK_COVERAGE_PERCENTILE)
  const targetAreaRange = TARGET_MAX_SCALE ** 2 - 1

  return coverage.map((value) => {
    const normalizedTone = Math.min(
      1,
      Math.max(0, (value - COVERAGE_FLOOR) / (darkCoverage - COVERAGE_FLOOR))
    )
    const adjustedTone = normalizedTone ** TONE_GAMMA
    const scale = Math.sqrt(1 + targetAreaRange * adjustedTone)

    return Number(scale.toFixed(4))
  })
}

function encodeScales(scales) {
  const scaleRange = TARGET_MAX_SCALE - 1

  return scales
    .map((scale) => {
      const normalizedScale = (scale - 1) / scaleRange
      const level = Math.round(normalizedScale * (QUANTIZATION_LEVELS - 1))
      return SCALE_ALPHABET[level]
    })
    .join("")
}

function renderPreview(scales) {
  const dotGap =
    (GRID_SIZE - OUTPUT_COLUMNS * DOT_DIAMETER) / (OUTPUT_COLUMNS - 1)
  const dotPitch = DOT_DIAMETER + dotGap
  const circles = scales.map((scale, index) => {
    const row = Math.floor(index / OUTPUT_COLUMNS)
    const column = index % OUTPUT_COLUMNS
    const centerX = column * dotPitch + DOT_DIAMETER / 2
    const centerY = row * dotPitch + DOT_DIAMETER / 2
    const radius = (DOT_DIAMETER / 2) * scale

    return `  <circle cx="${centerX.toFixed(3)}" cy="${centerY.toFixed(3)}" r="${radius.toFixed(3)}" />`
  })

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${GRID_SIZE} ${GRID_SIZE}">`,
    `  <rect width="${GRID_SIZE}" height="${GRID_SIZE}" fill="white" />`,
    '  <g fill="#999">',
    ...circles,
    "  </g>",
    "</svg>",
    "",
  ].join("\n")
}

function renderModule(patterns) {
  const entries = patterns.map(
    ({ name, scales, source }) =>
      `  // Generated from ${basename(source)}.\n  ${name}: { columns: ${OUTPUT_COLUMNS}, levels: "${encodeScales(scales)}" },`
  )

  return [
    "// Generated by scripts/generate-identity-patterns.mjs. Do not edit by hand.",
    "export const PORTRAIT_DOT_PATTERNS = {",
    ...entries,
    "} as const",
    "",
  ].join("\n")
}

const { output, previewDirectory, sources } = parseArguments(
  process.argv.slice(2)
)
const patterns = []

for (const source of sources) {
  const svg = await readFile(source.path, "utf8")
  const parsed = parseSvg(svg, source.path)
  const scales = coverageToScales(sampleCoverage(rasterize(parsed)))
  patterns.push({ ...source, scales, source: source.path })

  if (previewDirectory) {
    await mkdir(previewDirectory, { recursive: true })
    await writeFile(
      join(previewDirectory, `${source.name}.svg`),
      renderPreview(scales)
    )
  }
}

await mkdir(dirname(output), { recursive: true })
await writeFile(output, renderModule(patterns))
