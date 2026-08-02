"use server"

export type JoinFormState = {
  status: "idle" | "success" | "error"
  message?: string
}

const FALLBACK_ERROR =
  "Something went wrong. Please try again, or email hello@general-purpose.io."

function isPlausibleEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export async function submitJoinRequest(
  _previousState: JoinFormState,
  formData: FormData
): Promise<JoinFormState> {
  // Bots that fill every field trip this hidden input; pretend it worked.
  if (String(formData.get("website") ?? "") !== "") {
    return { status: "success" }
  }

  const name = String(formData.get("name") ?? "").trim()
  const email = String(formData.get("email") ?? "").trim()
  const message = String(formData.get("message") ?? "").trim()

  if (
    !name ||
    name.length > 100 ||
    !email ||
    email.length > 320 ||
    !isPlausibleEmail(email) ||
    !message ||
    message.length > 2000
  ) {
    return {
      status: "error",
      message: "Please fill in your name, a valid email, and a message.",
    }
  }

  const webhookUrl = process.env.JOIN_WEBHOOK_URL
  const webhookSecret = process.env.JOIN_WEBHOOK_SECRET

  if (!webhookUrl || !webhookSecret) {
    console.error("Join form submitted without webhook configuration")
    return { status: "error", message: FALLBACK_ERROR }
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      // text/plain keeps Apps Script from mangling the body; it still
      // arrives as e.postData.contents.
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ name, email, message, secret: webhookSecret }),
    })
    const body = await response.text()

    if (!response.ok || !body.includes('"ok":true')) {
      throw new Error(`Join webhook rejected submission: ${response.status}`)
    }

    return { status: "success" }
  } catch (error) {
    console.error("Join form webhook failed", error)
    return { status: "error", message: FALLBACK_ERROR }
  }
}
