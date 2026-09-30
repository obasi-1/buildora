import { useEffect, useState } from "react";
import { apiFetch } from "./sessionHook.js";

function repositoryLink(value) {
  try {
    const url = new URL(value);

    if (
      url.protocol === "https:" &&
      url.hostname === "github.com" &&
      !url.username &&
      !url.password &&
      !url.port
    ) {
      return url.href;
    }
  } catch {
    // Invalid saved links are displayed without a clickable link.
  }

  return null;
}

function formatDate(value) {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleString();
}

export default function MySubmissions({
  accessToken,
  onOpenPath,
  onLogin,
}) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadSubmissions() {
      setLoading(true);
      setError("");
      setExpired(false);

      try {
        const response = await apiFetch("/api/projects/submissions/", {
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        if (response.status === 401) {
          setExpired(true);
          throw new Error("Your session has expired. Please log in again.");
        }

        if (!response.ok) {
          throw new Error(
            `Unable to load your submissions (${response.status}).`
          );
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
          throw new Error("Unexpected submissions response.");
        }

        if (!controller.signal.aborted) {
          setSubmissions(data);
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

    loadSubmissions();

    return () => controller.abort();
  }, [accessToken, attempt]);

  return (
    <section className="module-section" aria-labelledby="submissions-title">
      <p className="eyebrow">YOUR PROJECT WORK</p>
      <h2 id="submissions-title">My submissions</h2>

      <p className="section-description">
        Revisit the projects you have built and update your submissions.
      </p>

      {loading && <p role="status">Loading your submissions…</p>}

      {error && (
        <div className="error-box" role="alert">
          <p>{error}</p>

          <button
            type="button"
            className="back-button"
            onClick={
              expired
                ? onLogin
                : () => setAttempt((previous) => previous + 1)
            }
          >
            {expired ? "Log in again" : "Try again"}
          </button>
        </div>
      )}

      {!loading && !error && submissions.length === 0 && (
        <div className="exercise-box">
          <p>No submissions are available yet.</p>
          <p>
            Open one of your learning paths, scroll to its projects,
            and submit your repository link when your work is ready.
          </p>
        </div>
      )}

      {!loading && !error && submissions.length > 0 && (
        <>
          <p>
            {submissions.length} saved{" "}
            {submissions.length === 1 ? "submission" : "submissions"}
          </p>

          <div className="path-grid">
            {submissions.map((submission) => {
              const link = repositoryLink(submission.repository_url);

              return (
                <article className="path-card" key={submission.id}>
                  <span className="card-label">SUBMITTED</span>

                  <h3>{submission.project_title}</h3>

                  <p className="submission-path">
                    {submission.learning_path_title}
                  </p>

                  <p className="submission-description">
                    {submission.description}
                  </p>

                  <p className="submission-date">
                    Last saved: {formatDate(submission.updated_at)}
                  </p>

                  <div className="submission-links">
                    {link && (
                      <a
                        className="resource-link"
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open repository ↗
                      </a>
                    )}

                    <button
                      type="button"
                      className="primary-link"
                      onClick={() =>
                        onOpenPath(submission.learning_path_slug)
                      }
                    >
                      Open project path →
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}