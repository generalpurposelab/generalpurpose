import "server-only"

import type { Route } from "next"
import { cache, type ComponentType } from "react"
import { readFile } from "node:fs/promises"
import { join } from "node:path"

import {
  isIdentityPattern,
  type IdentityPattern,
} from "@/components/gp-product-scales"
import { headingId } from "@/lib/heading-id"

export type WritingMetadata = {
  slug: string
  title: string
  indexTitle: string
  description: string
  author: string
  date: string
  dateLabel: string
  pattern: IdentityPattern
  challenge: string
}

export type WritingSection = {
  id: string
  title: string
}

type WritingModule = {
  default: ComponentType
  metadata: unknown
}

export type WritingIndexEntry = WritingMetadata & {
  href: Route<`/writing/${string}`>
}

const davidAdelaniSource = readFile(
  join(process.cwd(), "content/writing/david-adelani.mdx"),
  "utf8"
)

const writingPosts = {
  "david-adelani": {
    load: async () =>
      (await import("@/content/writing/david-adelani.mdx")) as WritingModule,
    source: davidAdelaniSource,
  },
} as const

export type WritingSlug = keyof typeof writingPosts

const writingSlugs = Object.freeze(Object.keys(writingPosts) as WritingSlug[])

function sectionTitle(markdown: string) {
  return markdown
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`]/g, "")
    .trim()
}

function validateMetadata(
  metadata: unknown,
  slug: string
): asserts metadata is WritingMetadata {
  if (!metadata || typeof metadata !== "object") {
    throw new Error(`Writing post ${slug} must export metadata`)
  }

  const values = metadata as Record<string, unknown>
  const required: (keyof WritingMetadata)[] = [
    "slug",
    "title",
    "indexTitle",
    "description",
    "author",
    "date",
    "dateLabel",
    "challenge",
  ]

  for (const field of required) {
    if (typeof values[field] !== "string" || values[field].length === 0) {
      throw new Error(`Writing post ${slug} is missing metadata.${field}`)
    }
  }

  if (values.slug !== slug) {
    throw new Error(`Writing post ${slug} has mismatched metadata.slug`)
  }

  if (!isIdentityPattern(values.pattern)) {
    throw new Error(`Writing post ${slug} has invalid metadata.pattern`)
  }
}

export function getWritingSlugs(): readonly WritingSlug[] {
  return writingSlugs
}

export function hasWritingPost(slug: string): slug is WritingSlug {
  return Object.hasOwn(writingPosts, slug)
}

export const getWritingPost = cache(async (slug: WritingSlug) => {
  const post = writingPosts[slug]
  const [writingModule, source] = await Promise.all([post.load(), post.source])
  const sectionIds = new Set<string>()
  const sections = Array.from(source.matchAll(/^##\s+(.+)$/gm), (match) => {
    const title = sectionTitle(match[1])
    const id = headingId(title)

    if (!id) {
      throw new Error(`Writing post ${slug} contains an empty section heading`)
    }

    if (sectionIds.has(id)) {
      throw new Error(`Writing post ${slug} contains duplicate heading ${id}`)
    }

    sectionIds.add(id)

    return { id, title }
  })

  validateMetadata(writingModule.metadata, slug)

  return {
    Content: writingModule.default,
    metadata: writingModule.metadata,
    sections,
  }
})

export async function getWritingIndex(): Promise<WritingIndexEntry[]> {
  const slugs = getWritingSlugs()
  const posts = await Promise.all(slugs.map((slug) => getWritingPost(slug)))

  return posts
    .map(({ metadata }) => ({
      ...metadata,
      href: `/writing/${metadata.slug}` as Route<`/writing/${string}`>,
    }))
    .toSorted((a, b) => b.date.localeCompare(a.date))
}
