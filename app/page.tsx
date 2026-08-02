import {
  HomePage,
  type HomeProject,
  type HomeWritingGroup,
} from "@/components/home-page"
import { projects } from "@/content/projects"
import { getWritingIndex } from "@/lib/writing"

const upcomingWriting = [
  {
    title: "Autonomy in the Amazon with Nigel Pitman",
    href: "/projects/canopy",
    dateTime: "2026-09-01",
    label: "Upcoming",
    pattern: "nigel",
    challenge: "real-time understanding of living ecosystems.",
    disabled: true,
  },
] as const

export default async function Page() {
  const publishedWriting = await getWritingIndex()
  const entries = [
    ...upcomingWriting,
    ...publishedWriting.map((post) => ({
      title: post.indexTitle,
      href: post.href,
      dateTime: post.date,
      pattern: post.pattern,
      challenge: post.challenge,
    })),
  ].toSorted((a, b) => b.dateTime.localeCompare(a.dateTime))
  const writingByYear = new Map<number, HomeWritingGroup["posts"][number][]>()

  for (const entry of entries) {
    const year = Number(entry.dateTime.slice(0, 4))
    const posts = writingByYear.get(year)

    if (posts) posts.push(entry)
    else writingByYear.set(year, [entry])
  }

  const writing: HomeWritingGroup[] = Array.from(
    writingByYear,
    ([year, posts]) => ({ year, posts })
  )
  const homeProjects: HomeProject[] = projects
    .map((project) => ({
      slug: project.slug,
      title: project.title,
      challenge: project.challenge,
      dateTime: project.indexDate,
      label: project.indexLabel,
      pattern: project.pattern,
    }))
    .toSorted((a, b) => b.dateTime.localeCompare(a.dateTime))

  return <HomePage projects={homeProjects} writing={writing} />
}
