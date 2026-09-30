import { useEffect, useRef, useState } from "react";
import { apiFetch } from "./sessionHook.js";

function SubmissionForm({ projectId, onLogin }) {
  const [form, setForm] = useState({
    repository_url: "",
    description: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [message, setMessage] = useState("");
  const [expired, setExpired] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const controllerRef = useRef(null);
  const savingRef = useRef(false);

  const url = `/api/projects/${projectId}/submission/`;

  useEffect(() => {
    const controller = new AbortController();
    controllerRef.current = controller;

    async function loadSubmission() {
      setLoading(true);
      setError("");
      setExpired(false);

      try {
        const response = await apiFetch(url, {
          signal: controller.signal,
        });

        const data = await response.json();

        if (controller.signal.aborted) return;

        if (response.status === 401) {
          setExpired(true);
          throw new Error("Please log in again to access your submission.");
        }

        if (!response.ok) {
          throw new Error(
            data.detail || "Unable to load your submission."
          );
        }

        const submission = data.submission;

        setSubmitted(Boolean(submission));
        setForm({
          repository_url: submission?.repository_url || "",
          description: submission?.description || "",
        });
        setLoaded(true);
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

    loadSubmission();

    return () => controller.abort();
  }, [url, attempt]);

  function changeField(event) {
    const { name, value } = event.target;

    setForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: "" }));
    setMessage("");
  }

  async function saveSubmission(event) {
    event.preventDefault();

    if (savingRef.current || !loaded || expired) return;

    const signal = controllerRef.current?.signal;
    if (!signal || signal.aborted) return;

    savingRef.current = true;
    setSaving(true);
    setError("");
    setFieldErrors({});
    setMessage("");

    try {
      const response = await apiFetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          repository_url: form.repository_url.trim(),
          description: form.description.trim(),
        }),
        signal,
      });

      const data = await response.json();

      if (signal.aborted) return;

      if (response.status === 401) {
        setExpired(true);
        throw new Error("Please log in again to save your submission.");
      }

      if (response.status === 400) {
        const errors = {};

        for (const name of ["repository_url", "description"]) {
          if (data[name]) {
            errors[name] = Array.isArray(data[name])
              ? data[name].join(" ")
              : String(data[name]);
          }
        }

        setFieldErrors(errors);
        setError(data.detail || "Please check your submission details.");
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.detail || `Unable to save (${response.status}).`
        );
      }

      setSubmitted(true);
      setForm({
        repository_url: data.submission.repository_url,
        description: data.submission.description,
      });
      setMessage(
        data.created
          ? "Your project submission has been saved."
          : "Your project submission has been updated."
      );
    } catch (err) {
      if (!signal.aborted && err.name !== "AbortError") {
        setError(
          err.message ||
            "Unable to confirm the save. Reopen this path to check."
        );
      }
    } finally {
      savingRef.current = false;

      if (!signal.aborted) {
        setSaving(false);
      }
    }
  }

  const idPrefix = `project-${projectId}`;

  return (
    <section className="submission-section">
      <h4>{submitted ? "Your saved submission" : "Submit your project"}</h4>

      {loading && <p role="status">Loading your submission…</p>}

      {error && (
        <div className="error-box" role="alert">
          <p>{error}</p>

          {expired ? (
            <button type="button" onClick={onLogin}>
              Log in again
            </button>
          ) : !loaded ? (
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

      {!loading && loaded && (
        <form className="auth-form" onSubmit={saveSubmission}>
          <label htmlFor={`${idPrefix}-repository`}>
            GitHub repository URL
          </label>

          <input
            id={`${idPrefix}-repository`}
            name="repository_url"
            type="url"
            placeholder="https://github.com/username/repository"
            value={form.repository_url}
            onChange={changeField}
            maxLength={500}
            required
            disabled={saving || expired}
            aria-invalid={Boolean(fieldErrors.repository_url)}
            aria-describedby={
              fieldErrors.repository_url
                ? `${idPrefix}-repository-error`
                : undefined
            }
          />

          {fieldErrors.repository_url && (
            <p
              id={`${idPrefix}-repository-error`}
              className="field-error"
            >
              {fieldErrors.repository_url}
            </p>
          )}

          <label htmlFor={`${idPrefix}-description`}>
            What did you build and learn?
          </label>

          <textarea
            id={`${idPrefix}-description`}
            name="description"
            rows={5}
            value={form.description}
            onChange={changeField}
            maxLength={2000}
            required
            disabled={saving || expired}
            aria-invalid={Boolean(fieldErrors.description)}
            aria-describedby={
              fieldErrors.description
                ? `${idPrefix}-description-error`
                : undefined
            }
          />

          {fieldErrors.description && (
            <p
              id={`${idPrefix}-description-error`}
              className="field-error"
            >
              {fieldErrors.description}
            </p>
          )}

          <p className="profile-note">
            You can return to update your submission.
            Saving does not automatically grade your code.
          </p>

          <button
            type="submit"
            className="primary-link"
            disabled={saving || expired}
          >
            {saving
              ? "Saving…"
              : submitted
                ? "Update submission"
                : "Save submission"}
          </button>
        </form>
      )}
    </section>
  );
}

export default function PathProjects({
  slug,
  session,
  enrolled,
  onLogin,
}) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProjects() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `/api/projects/paths/${encodeURIComponent(slug)}/`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error(
            `Unable to load projects (${response.status}).`
          );
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
          throw new Error("Unexpected project response.");
        }

        if (!controller.signal.aborted) {
          setProjects(data);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err.message || "Unable to connect.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadProjects();

    return () => controller.abort();
  }, [slug, attempt]);

  return (
    <section className="module-section" aria-label="Practice projects">
      <p className="eyebrow">LEARN BY BUILDING</p>
      <h2>Put your skills into practice</h2>

      {loading && <p role="status">Loading projects…</p>}

      {error && (
        <div className="error-box" role="alert">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => setAttempt((previous) => previous + 1)}
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !error && projects.length === 0 && (
        <p>No projects have been published for this path yet.</p>
      )}

      {!loading && !error && projects.map((project) => (
        <article className="lesson-card" key={project.id}>
          <h3>{project.title}</h3>
          <div className="lesson-content">{project.brief}</div>

          {project.requirements && (
            <div className="exercise-box">
              <h4>Project requirements</h4>
              <div className="lesson-content">
                {project.requirements}
              </div>
            </div>
          )}

          {!session?.accessToken ? (
            <button
              type="button"
              className="primary-link"
              onClick={onLogin}
            >
              Log in to submit
            </button>
          ) : !enrolled ? (
            <p>
              Enrol using the Your progress section to submit your work.
              If progress is still loading, the form will appear once
              your enrolment is confirmed.
            </p>
          ) : (
            <SubmissionForm
              key={`${project.id}-${session.user.id}-${session.accessToken}`}
              projectId={project.id}
              onLogin={onLogin}
            />
          )}
        </article>
      ))}
    </section>
  );
}