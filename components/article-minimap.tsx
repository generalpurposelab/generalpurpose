"use client"

import { useEffect, useState } from "react"

type MinimapSection = {
  id: string
  title: string
}

export function ArticleMinimap({
  title,
  sections,
}: {
  title?: string
  sections: readonly MinimapSection[]
}) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "")

  useEffect(() => {
    let frame = 0
    let disposed = false
    let sectionPositions: { id: string; top: number }[] = []

    const measureSections = () => {
      sectionPositions = sections.flatMap(({ id }) => {
        const element = document.getElementById(id)
        return element ? [{ id, top: element.offsetTop }] : []
      })
    }

    const updateActiveSection = () => {
      const marker = window.scrollY + window.innerHeight * 0.3
      const pageBottom =
        window.scrollY + window.innerHeight >=
        document.documentElement.scrollHeight - 2
      let nextId = sections[0]?.id ?? ""

      for (const section of sectionPositions) {
        if (section.top <= marker) nextId = section.id
      }

      if (pageBottom) nextId = sections.at(-1)?.id ?? nextId
      setActiveId((current) => (current === nextId ? current : nextId))
      frame = 0
    }

    const requestUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(updateActiveSection)
    }

    const handleResize = () => {
      measureSections()
      requestUpdate()
    }

    measureSections()
    updateActiveSection()
    window.addEventListener("scroll", requestUpdate, { passive: true })
    window.addEventListener("resize", handleResize)
    window.addEventListener("load", handleResize, { once: true })
    void document.fonts?.ready.then(() => {
      if (!disposed) handleResize()
    })

    return () => {
      disposed = true
      window.removeEventListener("scroll", requestUpdate)
      window.removeEventListener("resize", handleResize)
      window.removeEventListener("load", handleResize)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [sections])

  return (
    <nav className="dip-toc-nav" aria-label="On this page">
      {title ? <h2>{title}</h2> : null}
      <ul>
        {sections.map((section) => {
          const isActive = section.id === activeId

          return (
            <li data-active={isActive} key={section.id}>
              <a
                href={`#${section.id}`}
                aria-current={isActive ? "location" : undefined}
                onClick={() => setActiveId(section.id)}
              >
                {section.title}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
