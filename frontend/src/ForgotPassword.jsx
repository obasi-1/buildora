import { useState } from "react";

export default function ForgotPassword({ onBack, header }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (loading || submitted) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/accounts/password-reset/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const emailError = Array.isArray(data.email)
          ? data.email.join(" ")
          : data.email;

        throw new Error(
          response.status === 429
            ? "Too many requests. Please try again later."
            : emailError ||
                data.detail ||
                "Unable to request a reset link. Please try again."
        );
      }

      setSubmitted(true);
      window.scrollTo(0, 0);
    } catch (err) {
      setError(
        err.message || "Unable to connect. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="site">
      <fieldset
  disabled={loading}
  aria-label="Page navigation"
  style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
>
  {header}
</fieldset>

      <main className="auth-page">
        <p className="eyebrow">ACCOUNT RECOVERY</p>

        <div role="status" aria-live="polite" aria-atomic="true">
          <h1 className="path-title">
            {submitted ? "Check your email" : "Forgot your password?"}
          </h1>

          {submitted && (
            <div className="exercise-box">
              <p>
                If an account uses that email address, you’ll receive
                a link to reset your password.
              </p>
              <p>
                Check your inbox and spam folder. The link expires
                after 30 minutes.
              </p>
            </div>
          )}
        </div>

        {submitted ? (
          <button
            type="button"
            className="primary-link"
            onClick={onBack}
          >
            Back to login →
          </button>
        ) : (
          <>
            <p className="section-description">
              Enter the email address you used to create your account.
              We’ll send you a link to choose a new password.
            </p>

            <form className="auth-form" onSubmit={handleSubmit}>
              <label htmlFor="reset-email">Email address</label>

              <input
                id="reset-email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                disabled={loading}
              />

              {error && (
                <p className="error-box" role="alert">
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="primary-link"
                disabled={loading}
              >
                {loading ? "Requesting link…" : "Send reset link"}
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}