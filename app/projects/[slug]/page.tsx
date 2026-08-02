import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { ProjectArticle } from "@/components/project-article"
import { getProject, projects } from "@/content/projects"

export const dynamicParams = false

export function generateStaticParams() {
  return projects.map((project) => ({ slug: project.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const project = getProject(slug)

  if (!project) return {}

  return {
    title: project.title,
    description: project.summary,
    alternates: { canonical: `/projects/${project.slug}` },
    openGraph: {
      type: "article",
      title: project.title,
      description: project.summary,
      url: `/projects/${project.slug}`,
      publishedTime: project.publishedAt,
      images: ["/og.png"],
    },
    twitter: {
      card: "summary_large_image",
      title: project.title,
      description: project.summary,
      images: ["/og.png"],
    },
  }
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const project = getProject(slug)

  if (!project) notFound()

  return <ProjectArticle project={project} />
}
