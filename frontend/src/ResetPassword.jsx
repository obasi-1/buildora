import { useState } from "react";

export default function ResetPassword({ uid, token, onLogin, header }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const missingLink = !uid || !token;

  async function handleSubmit(event) {
    event.preventDefault();
    if (loading || missingLink) return;

    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "/api/accounts/password-reset/confirm/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            uid,
            token,
            new_password: password,
            new_password_confirm: confirmPassword,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const messages = [
          data.detail,
          data.new_password,
          data.new_password_confirm,
          data.non_field_errors,
        ]
          .flat()
          .filter((message) => typeof message === "string")
          .join(" ");

        throw new Error(
          response.status === 429
            ? "Too many attempts. Please try again later."
            : messages ||
                "Unable to reset your password. Please request a new link."
        );
      }

      setPassword("");
      setConfirmPassword("");
      setSuccess(true);
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
        <h1 className="path-title">
          {success ? "Password updated." : "Choose a new password."}
        </h1>

        {success ? (
          <>
            <div className="exercise-box" role="status">
              <p>
                Your password has been reset. Log in with your
                new password to continue.
              </p>
            </div>

            <button
              type="button"
              className="primary-link"
              onClick={onLogin}
            >
              Go to login
            </button>
          </>
        ) : missingLink ? (
          <p className="error-box" role="alert">
            This reset link is incomplete. Return to login and
            choose “Forgot password?” to request a new one.
          </p>
        ) : (
          <>
            <p className="section-description">
              Use a strong password that you don’t use for another
              account.
            </p>

            <form className="auth-form" onSubmit={handleSubmit}>
              <label htmlFor="new-password">New password</label>
              <input
                id="new-password"
                name="new_password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                disabled={loading}
              />

              <label htmlFor="confirm-new-password">
                Confirm new password
              </label>
              <input
                id="confirm-new-password"
                name="new_password_confirm"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
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
                {loading ? "Saving password…" : "Reset password"}
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}