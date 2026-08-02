import type { Route } from "next"
import Link from "next/link"

const backIcon = (
  <svg
    aria-hidden="true"
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
  >
    <path
      d="M5.5 4 1.5 8m0 0 4 4m-4-4H10a2.5 2.5 0 0 0 2.5-2.5A2.5 2.5 0 0 0 10 3H8.5"
      stroke="currentColor"
    />
  </svg>
)

export function BackLink({
  href = "/",
  label,
}: {
  href?: Route
  label: string
}) {
  return (
    <Link className="dip-back-button" href={href}>
      {backIcon}
      {label}
    </Link>
  )
}
