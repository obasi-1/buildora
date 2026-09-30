import { useEffect, useState } from "react";
import { apiFetch } from "./sessionHook.js";
import MySubmissions from "./MySubmissions.jsx";

export default function Dashboard({
  accessToken,
  onBack,
  onOpenPath,
  onLogin,
}) {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadDashboard() {
      try {
        const response = await apiFetch("/api/progress/dashboard/", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        if (response.status === 401) {
          setExpired(true);
          throw new Error("Your session has expired. Please log in again.");
        }

        if (!response.ok) {
          throw new Error(
            `Unable to load your dashboard (${response.status}).`
          );
        }

        const data = await response.json();

        if (!Array.isArray(data.paths)) {
          throw new Error("Unexpected dashboard response.");
        }

        if (!controller.signal.aborted) {
          setDashboard(data);
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

    loadDashboard();

    return () => controller.abort();
  }, [accessToken, attempt]);

  function retry() {
    setError("");
    setDashboard(null);
    setLoading(true);
    setAttempt((previous) => previous + 1);
  }

  return (
    <div className="site">
      <header className="site-header">
        <button
          type="button"
          className="brand brand-button"
          onClick={onBack}
          aria-label="Buildora home"
        >
          Buildora<span>.</span>
        </button>

        <button
          type="button"
          className="back-button"
          onClick={onBack}
        >
          Explore learning paths
        </button>
      </header>

      <main className="learning-detail">
        <p className="eyebrow">YOUR LEARNING JOURNEY</p>
        <h1 className="path-title">My dashboard</h1>

        {loading && <p role="status">Loading your dashboard…</p>}

        {error && (
          <div className="error-box" role="alert">
            <p>{error}</p>

            <button
              type="button"
              onClick={expired ? onLogin : retry}
            >
              {expired ? "Log in again" : "Try again"}
            </button>
          </div>
        )}

        {!loading && !error && dashboard && (
          <>
            <p className="section-description">
              Welcome, {dashboard.username}. Here is your saved progress.
            </p>

            <dl className="dashboard-stats">
              <div className="stat-card">
                <dt>Enrolled paths</dt>
                <dd>{dashboard.enrolled_paths}</dd>
              </div>

              <div className="stat-card">
                <dt>Completed paths</dt>
                <dd>{dashboard.completed_paths}</dd>
              </div>
            </dl>

            <h2>My learning paths</h2>

            {dashboard.paths.length === 0 ? (
              <div className="exercise-box">
                <p>
                  You haven’t enrolled in any published learning paths yet.
                </p>
                <button
                  type="button"
                  className="primary-link"
                  onClick={onBack}
                >
                  Find a learning path →
                </button>
              </div>
            ) : (
              <div className="path-grid">
                {dashboard.paths.map((path) => (
                  <article className="path-card" key={path.id}>
                    <span className="card-label">
                      {path.is_complete ? "COMPLETED" : "IN PROGRESS"}
                    </span>

                    <h3>{path.title}</h3>

                    <p>
                      {path.completed_lessons} of {path.total_lessons} lessons
                      completed — {path.progress_percentage}%
                    </p>

                    <progress
                      className="dashboard-progress"
                      value={path.progress_percentage}
                      max="100"
                      aria-label={`${path.title} completion`}
                    />

                    <button
                      type="button"
                      className="primary-link"
                      onClick={() => onOpenPath(path.slug)}
                    >
                      {path.is_complete
                        ? "Review lessons →"
                        : "Continue learning →"}
                    </button>
                  </article>
                ))}
                            </div>
            )}

            <MySubmissions
              accessToken={accessToken}
              onOpenPath={onOpenPath}
              onLogin={onLogin}
            />
          </>
        )}
      </main>

      <footer>Buildora · Learn. Build. Become.</footer>
    </div>
  );
}