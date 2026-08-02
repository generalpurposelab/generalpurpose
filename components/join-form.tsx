"use client"

import type { FormEvent } from "react"

export function JoinForm() {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const form = new FormData(event.currentTarget)
    const name = String(form.get("name") ?? "")
    const email = String(form.get("email") ?? "")
    const message = String(form.get("message") ?? "")
    const subject = `Joining General Purpose — ${name}`
    const body = [`Name: ${name}`, `Email: ${email}`, "", message].join("\n")

    window.location.href = `mailto:hello@general-purpose.io?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  return (
    <form className="join-form" onSubmit={handleSubmit}>
      <div className="join-field">
        <label htmlFor="join-name">Name</label>
        <input
          id="join-name"
          name="name"
          type="text"
          autoComplete="name"
          maxLength={100}
          required
        />
      </div>

      <div className="join-field">
        <label htmlFor="join-email">Email</label>
        <input
          id="join-email"
          name="email"
          type="email"
          autoComplete="email"
          maxLength={320}
          required
        />
      </div>

      <div className="join-field">
        <label htmlFor="join-message">What would you like to work on?</label>
        <textarea
          id="join-message"
          name="message"
          maxLength={2000}
          rows={4}
          required
        />
      </div>

      <button className="join-submit" type="submit">
        Join us
      </button>
    </form>
  )
}
