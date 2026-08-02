import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { WritingArticleLayout } from "@/components/writing/article-layout"
import {
  getWritingPost,
  getWritingSlugs,
  hasWritingPost,
  type WritingMetadata,
} from "@/lib/writing"

export const dynamicParams = false

export function generateStaticParams() {
  return getWritingSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params

  if (!hasWritingPost(slug)) return {}

  const { metadata } = await getWritingPost(slug)

  return articleMetadata(metadata)
}

function articleMetadata(metadata: WritingMetadata): Metadata {
  return {
    title: metadata.title,
    description: metadata.description,
    authors: [{ name: metadata.author }],
    alternates: { canonical: `/writing/${metadata.slug}` },
    openGraph: {
      type: "article",
      title: metadata.title,
      description: metadata.description,
      url: `/writing/${metadata.slug}`,
      publishedTime: metadata.date,
      authors: [metadata.author],
      images: ["/og.png"],
    },
    twitter: {
      card: "summary_large_image",
      title: metadata.title,
      description: metadata.description,
      images: ["/og.png"],
    },
  }
}

export default async function WritingPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  if (!hasWritingPost(slug)) notFound()

  const { Content, metadata, sections } = await getWritingPost(slug)

  return (
    <WritingArticleLayout metadata={metadata} sections={sections}>
      <Content />
    </WritingArticleLayout>
  )
}
