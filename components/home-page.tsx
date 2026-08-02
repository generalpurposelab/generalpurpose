import Link from "next/link"
import type { Route } from "next"

import { HomeIdentityPreview } from "@/components/home-identity-preview"
import type { IdentityPattern } from "@/components/gp-product-scales"

type HomeWritingHref = Route<`/projects/${string}` | `/writing/${string}`>

/*
const TEAM = [
  ["Ed Bayes", "https://x.com/edbayes"],
  ["Trevor Cobb", "https://x.com/TrevorStormCobb"],
  ["Jake Schonberger", "https://x.com/SchonbergerJake"],
] as const
*/

export type HomeProject = {
  slug: string
  title: string
  challenge: string
  dateLabel: string
  dateTime: string
  label?: string
  pattern: IdentityPattern
}

export type HomeWritingGroup = {
  year: number
  posts: readonly {
    title: string
    href: HomeWritingHref
    date: string
    dateTime: string
    label?: string
    pattern: IdentityPattern
    challenge: string
    disabled?: boolean
  }[]
}

export function HomePage({
  projects,
  writing,
}: {
  projects: readonly HomeProject[]
  writing: readonly HomeWritingGroup[]
}) {
  const challengeByPattern: Partial<Record<IdentityPattern, string>> = {}

  for (const project of projects) {
    challengeByPattern[project.pattern] = project.challenge
  }

  for (const group of writing) {
    for (const post of group.posts) {
      challengeByPattern[post.pattern] = post.challenge
    }
  }

  return (
    <HomeIdentityPreview challengeByPattern={challengeByPattern}>
      <section className="section">
        <h2 className="heading">Projects</h2>
        <table className="writing-table projects-table">
          <tbody>
            {projects.map((project) => {
              const year = project.dateTime.slice(0, 4)
              return (
                <tr className="writing-row project-row" key={project.slug}>
                  <th scope="row">
                    <time dateTime={project.dateTime}>{year}</time>
                  </th>
                  <td className="writing-title project-title">
                    <Link
                      href={`/projects/${project.slug}`}
                      data-identity-pattern={project.pattern}
                      data-preload-canopy-globe={
                        project.slug === "uhura" ? "" : undefined
                      }
                    >
                      {project.title}
                    </Link>
                    {project.label ? (
                      <span className="writing-label">{project.label}</span>
                    ) : null}
                  </td>
                  <td className="writing-date">
                    <time dateTime={project.dateTime}>{project.dateLabel}</time>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      <section className="section writing-section">
        <h2 className="heading">Writing</h2>
        <table className="writing-table">
          {writing.map((group) => (
            <tbody key={group.year}>
              {group.posts.map((post, index) => (
                <tr className="writing-row" key={post.href}>
                  {index === 0 ? (
                    <th scope="rowgroup" rowSpan={group.posts.length}>
                      {group.year}
                    </th>
                  ) : null}
                  <td className="writing-title">
                    {post.disabled ? (
                      <span
                        className="writing-title-disabled"
                        data-identity-pattern={post.pattern}
                      >
                        {post.title}
                        {post.label ? (
                          <span className="writing-label">{post.label}</span>
                        ) : null}
                      </span>
                    ) : (
                      <>
                        <Link
                          href={post.href}
                          data-identity-pattern={post.pattern}
                          data-preload-canopy-globe={
                            post.href === "/projects/uhura" ? "" : undefined
                          }
                        >
                          {post.title}
                        </Link>
                        {post.label ? (
                          <span className="writing-label">{post.label}</span>
                        ) : null}
                      </>
                    )}
                  </td>
                  <td className="writing-date">
                    <time dateTime={post.dateTime}>{post.date}</time>
                  </td>
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </section>

      {/*
        <section className="section">
          <h2 className="heading">Team</h2>
          <ul className="team-list">
            {TEAM.map(([name, href]) => (
              <li key={name}>
                <a href={href} rel="noopener noreferrer" target="_blank">
                  {name}
                </a>
              </li>
            ))}
          </ul>
        </section>
      */}

      <div className="time-greeting">
        The future is here. It&apos;s just not evenly distributed.{" "}
        <Link href="/join">Join us</Link>.
      </div>
    </HomeIdentityPreview>
  )
}
