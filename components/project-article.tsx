import { Fragment, type ReactNode } from "react"

import { ArticleMinimap } from "@/components/article-minimap"
import { BackLink } from "@/components/back-link"
import { CanopyGlobe } from "@/components/canopy-globe"
import { ArticleImage } from "@/components/writing/article-media"
import type { ProjectPost } from "@/content/projects"
import { dipFontVariables } from "@/lib/dip-fonts"
import rainforestTrekImage from "@/public/images/rainforest.jpeg"
import rainforestBasecampImage from "@/public/images/rainforest-2.jpeg"
import uhuraInterfaceImage from "@/public/images/uhura-interface.png"

const MEDIA_AFTER_SECTION = new Set([1, 3])

function ImageBlock({ children }: { children?: ReactNode }) {
  const isEmpty = children == null

  return (
    <div className="dip-project-media" aria-hidden={isEmpty || undefined}>
      <div
        className={`dip-project-frame${isEmpty ? " dip-project-frame--empty" : ""}`}
      >
        {children}
      </div>
    </div>
  )
}

function ProjectHero({ hero }: { hero: ProjectPost["hero"] }) {
  if (hero === "globe") {
    return (
      <ImageBlock>
        <CanopyGlobe />
      </ImageBlock>
    )
  }

  return (
    <ArticleImage
      src={rainforestTrekImage}
      alt="Two field team members carrying survey equipment through dense rainforest understory"
      priority
    />
  )
}

function ProjectMediaSlot({
  sectionIndex,
  slug,
}: {
  sectionIndex: number
  slug: ProjectPost["slug"]
}) {
  if (slug === "uhura" && sectionIndex === 1) {
    return (
      <ArticleImage
        src={uhuraInterfaceImage}
        alt="Uhura translation interface showing an English science question and its Yorùbá translation with matching answer choices"
        fit="contain"
      />
    )
  }

  if (slug === "canopy") {
    return sectionIndex === 3 ? (
      <ArticleImage
        src={rainforestBasecampImage}
        alt="A laptop showing species identification results on a riverside deck at sunrise during the XPRIZE Rainforest final"
      />
    ) : null
  }

  return sectionIndex === 1 ? <ImageBlock /> : null
}

export function ProjectArticle({ project }: { project: ProjectPost }) {
  return (
    <div className={`dip-page dip-page--${project.slug} ${dipFontVariables}`}>
      <aside className="dip-aside">
        <BackLink label="Home" />
        <div className="dip-toc">
          <ArticleMinimap sections={project.sections} />
        </div>
      </aside>

      <main>
        <article className="dip-article">
          <header>
            <h1 id={project.slug}>{project.title}</h1>
            <time dateTime={project.publishedAt}>{project.period}</time>
          </header>

          <p>{project.summary}</p>
          <ProjectHero hero={project.hero} />

          {project.sections.map((section, sectionIndex) => (
            <Fragment key={section.id}>
              {sectionIndex === 0 ? (
                <div className="dip-heading-divider" id={section.id}>
                  <div className="dip-heading-rule">
                    <hr />
                  </div>
                  <div className="dip-heading-label">
                    <div>
                      <h2>{section.title}</h2>
                    </div>
                  </div>
                </div>
              ) : (
                <h2 id={section.id}>{section.title}</h2>
              )}

              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}

              {section.points ? (
                <ul>
                  {section.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              ) : null}

              {section.stats ? (
                <dl className="dip-project-stats">
                  {section.stats.map((stat) => (
                    <Fragment key={stat.label}>
                      <dt>{stat.label}</dt>
                      <dd>{stat.value}</dd>
                    </Fragment>
                  ))}
                </dl>
              ) : null}

              {MEDIA_AFTER_SECTION.has(sectionIndex) ? (
                <ProjectMediaSlot
                  sectionIndex={sectionIndex}
                  slug={project.slug}
                />
              ) : null}
            </Fragment>
          ))}

          {project.sources.length > 0 ? (
            <footer>
              <h2>Sources</h2>
              {project.sources.map((source) => (
                <p key={source.href}>
                  <a
                    className="dip-basic-link"
                    href={source.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {source.label}
                  </a>
                </p>
              ))}
            </footer>
          ) : null}
        </article>
      </main>
    </div>
  )
}
