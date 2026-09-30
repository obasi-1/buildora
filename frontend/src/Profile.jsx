import { useEffect, useRef, useState } from "react";
import { apiFetch } from "./sessionHook.js";

const editableFields = [
  { name: "first_name", label: "First name" },
  { name: "last_name", label: "Last name" },
  { name: "bio", label: "Bio", multiline: true },
  { name: "learning_goal", label: "Learning goal", multiline: true },
];

function formFromUser(user) {
  return {
    first_name: user.first_name || "",
    last_name: user.last_name || "",
    bio: user.bio || "",
    learning_goal: user.learning_goal || "",
  };
}

export default function Profile({ onBack, onLogin, onSaved }) {
  const [user, setUser] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [message, setMessage] = useState("");
  const [expired, setExpired] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const controllerRef = useRef(null);
  const savingRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    controllerRef.current = controller;

    async function loadProfile() {
      setLoading(true);
      setError("");
      setExpired(false);

      try {
        const response = await apiFetch("/api/accounts/me/", {
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        if (response.status === 401) {
          setExpired(true);
          throw new Error("Your session has expired. Please log in again.");
        }

        if (!response.ok) {
          throw new Error(
            `Unable to load your profile (${response.status}).`
          );
        }

        const data = await response.json();

        if (!controller.signal.aborted) {
          setUser(data);
          setForm(formFromUser(data));
        }
      } catch (err) {
        if (!controller.signal.aborted && err.name !== "AbortError") {
          setError(err.message || "Unable to connect.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => controller.abort();
  }, [attempt]);

  function changeField(event) {
    const { name, value } = event.target;

    setForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: "" }));
    setMessage("");
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (savingRef.current || !form || expired) return;

    const signal = controllerRef.current?.signal;
    if (!signal || signal.aborted) return;

    savingRef.current = true;
    setSaving(true);
    setError("");
    setMessage("");
    setFieldErrors({});

    try {
      const response = await apiFetch("/api/accounts/me/", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
        signal,
      });

      if (signal.aborted) return;

      if (response.status === 401) {
        setExpired(true);
        throw new Error("Your session has expired. Please log in again.");
      }

      const data = await response.json();

      if (signal.aborted) return;

      if (response.status === 400) {
        const errors = {};

        for (const field of editableFields) {
          const problem = data[field.name];

          if (problem) {
            errors[field.name] = Array.isArray(problem)
              ? problem.join(" ")
              : String(problem);
          }
        }

        setFieldErrors(errors);
        setError(
          data.detail ||
            (Array.isArray(data.non_field_errors)
              ? data.non_field_errors.join(" ")
              : "Please check the highlighted fields.")
        );
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.detail || `Unable to save your profile (${response.status}).`
        );
      }

      setUser(data);
      setForm(formFromUser(data));
      onSaved(data);
      setMessage("Your profile has been saved.");
    } catch (err) {
      if (!signal.aborted && err.name !== "AbortError") {
        setError(
          err.message ||
            "Unable to confirm the save. Reopen your profile to check it."
        );
      }
    } finally {
      savingRef.current = false;

      if (!signal.aborted) {
        setSaving(false);
      }
    }
  }

  return (
    <div className="site">
      <header className="site-header">
        <span className="brand">
          Buildora<span>.</span>
        </span>

        <button
          type="button"
          className="back-button"
          onClick={onBack}
          disabled={saving}
        >
          ← Back
        </button>
      </header>

      <main className="auth-page profile-page">
        <p className="eyebrow">YOUR ACCOUNT</p>
        <h1 className="path-title">My profile</h1>
        <p className="section-description">
          Tell us a little about yourself and what you want to build.
        </p>

        {loading && <p role="status">Loading your profile…</p>}

        {error && (
          <div className="error-box" role="alert">
            <p>{error}</p>

            {expired ? (
              <button type="button" onClick={onLogin}>
                Log in again
              </button>
            ) : !form ? (
              <button
                type="button"
                onClick={() => setAttempt((previous) => previous + 1)}
              >
                Try again
              </button>
            ) : null}
          </div>
        )}

        {message && <p role="status">{message}</p>}

        {!loading && user && form && (
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field">
              <label htmlFor="profile-username">Username</label>
              <input
                id="profile-username"
                value={user.username}
                readOnly
              />
            </div>

            <div className="auth-field">
              <label htmlFor="profile-email">Email address</label>
              <input
                id="profile-email"
                value={user.email || ""}
                readOnly
              />
            </div>

            <p className="profile-note">
              Username and email cannot be changed here.
              The fields below are optional.
            </p>

            {editableFields.map((field) => {
              const Input = field.multiline ? "textarea" : "input";
              const fieldError = fieldErrors[field.name];

              return (
                <div className="auth-field" key={field.name}>
                  <label htmlFor={`profile-${field.name}`}>
                    {field.label}
                  </label>

                  <Input
                    id={`profile-${field.name}`}
                    name={field.name}
                    value={form[field.name]}
                    onChange={changeField}
                    disabled={saving || expired}
                    aria-invalid={Boolean(fieldError)}
                    aria-describedby={
                      fieldError ? `${field.name}-error` : undefined
                    }
                    {...(field.multiline ? { rows: 4 } : { type: "text" })}
                  />

                  {fieldError && (
                    <p
                      id={`${field.name}-error`}
                      className="field-error"
                    >
                      {fieldError}
                    </p>
                  )}
                </div>
              );
            })}

            <button
              type="submit"
              className="primary-link"
              disabled={saving || expired}
            >
              {saving ? "Saving…" : "Save profile"}
            </button>
          </form>
        )}
      </main>

      <footer>Buildora · Learn. Build. Become.</footer>
    </div>
  );
}