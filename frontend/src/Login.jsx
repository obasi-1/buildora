import { useState } from "react";
import Register from "./Register.jsx";
import ForgotPassword from "./ForgotPassword.jsx";

export default function Login({
  onSuccess,
  header,
  onRegister,
  onForgotPassword,
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  function switchScreen(register) {
  setError("");
  setPassword("");

  if (register && onRegister) {
    onRegister();
    return;
  }

  setShowRegister(register);
  window.scrollTo(0, 0);
}

  async function handleSubmit(event) {
    event.preventDefault();
    if (loading) return;

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/accounts/login/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      if (!response.ok) {
        throw new Error(
          response.status === 401
            ? "Incorrect username or password."
            : `Login failed (${response.status}). Please try again.`
        );
      }

      const tokens = await response.json();

      if (!tokens.access) {
        throw new Error("The server did not return an access token.");
      }

      const profileResponse = await fetch("/api/accounts/me/", {
        headers: {
          Authorization: `Bearer ${tokens.access}`,
        },
      });

      if (!profileResponse.ok) {
        throw new Error("Unable to load your profile. Please try again.");
      }

      const user = await profileResponse.json();

      onSuccess({
  user,
  accessToken: tokens.access,
  refreshToken: tokens.refresh,
});
    } catch (err) {
      setError(err.message || "Unable to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (showForgotPassword) {
  return (
    <ForgotPassword
      onBack={() => {
        setShowForgotPassword(false);
        window.scrollTo(0, 0);
      }}
    />
  );
}

  if (showRegister) {
    return (
      <Register
        onLogin={() => switchScreen(false)}
        onBack={() => switchScreen(false)}
      />
    );
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
        <p className="eyebrow">CONTINUE YOUR JOURNEY</p>
        <h1 className="path-title">Welcome back.</h1>

        <p className="section-description">
          Log in to continue learning with Buildora.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="username">Username</label>
          <input
            id="username"
            name="username"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
            disabled={loading}
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            disabled={loading}
          />

          <button
  type="button"
  className="text-button"
  disabled={loading}
  onClick={() => {
    setError("");
    setPassword("");

    if (onForgotPassword) {
      onForgotPassword();
      return;
    }

    setShowForgotPassword(true);
    window.scrollTo(0, 0);
  }}
>
  Forgot password?
</button>

          {error && (
            <p className="error-box" role="alert">
              {error}
            </p>
          )}

          <button
            className="primary-link"
            type="submit"
            disabled={loading}
          >
            {loading ? "Logging in…" : "Log in"}
          </button>
        </form>

        <p className="auth-switch">
          New to Buildora?{" "}
          <button
            type="button"
            className="text-button"
            onClick={() => switchScreen(true)}
            disabled={loading}
          >
            Create account
          </button>
        </p>
      </main>
    </div>
  );
}