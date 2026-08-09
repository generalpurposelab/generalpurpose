"use client"

import { useActionState } from "react"

import { submitJoinRequest, type JoinFormState } from "@/app/join/actions"

const INITIAL_STATE: JoinFormState = { status: "idle" }

export function JoinForm() {
  const [state, formAction, isPending] = useActionState(
    submitJoinRequest,
    INITIAL_STATE
  )

  if (state.status === "success") {
    return (
      <p className="join-confirmation" role="status">
        Thanks — you&apos;re on the list. We&apos;ll be in touch.
      </p>
    )
  }

  return (
    <form className="join-form" action={formAction}>
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

      <label className="join-newsletter" htmlFor="join-newsletter">
        <input
          id="join-newsletter"
          name="newsletter"
          type="checkbox"
          defaultChecked
        />
        <span>Add me to the General Purpose newsletter.</span>
      </label>

      <div className="join-honeypot" aria-hidden="true">
        <label htmlFor="join-website">Website</label>
        <input
          id="join-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {state.status === "error" ? (
        <p className="join-error" role="alert">
          {state.message}
        </p>
      ) : null}

      <button className="join-submit" type="submit" disabled={isPending}>
        {isPending ? "Joining…" : "Join us"}
      </button>
    </form>
  )
}
