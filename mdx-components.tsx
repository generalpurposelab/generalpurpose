import { isValidElement, type ReactNode } from "react"
import type { MDXComponents } from "mdx/types"

import { headingId } from "@/lib/heading-id"

function nodeText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node)
  }

  if (Array.isArray(node)) return node.map(nodeText).join("")

  if (isValidElement<{ children?: ReactNode }>(node)) {
    return nodeText(node.props.children)
  }

  return ""
}

const components = {
  h2: ({ children }) => <h2 id={headingId(nodeText(children))}>{children}</h2>,
  a: ({ href = "", children, ...props }) => {
    const external = href.startsWith("http")

    return (
      <a
        {...props}
        className="dip-basic-link"
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
      >
        {children}
      </a>
    )
  },
} satisfies MDXComponents

export function useMDXComponents(): MDXComponents {
  return components
}
