import type { MetadataRoute } from "next"

import { projects } from "@/content/projects"
import { absoluteUrl } from "@/lib/site"
import { getWritingIndex } from "@/lib/writing"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const writing = await getWritingIndex()

  return [
    {
      url: absoluteUrl("/"),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: absoluteUrl("/about"),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: absoluteUrl("/join"),
      changeFrequency: "yearly",
      priority: 0.4,
    },
    ...projects.map((project) => ({
      url: absoluteUrl(`/projects/${project.slug}`),
      lastModified: project.publishedAt,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...writing.map((post) => ({
      url: absoluteUrl(post.href),
      lastModified: post.date,
      changeFrequency: "yearly" as const,
      priority: 0.7,
    })),
  ]
}
