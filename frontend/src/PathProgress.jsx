import { useEffect, useState } from "react";

export default function PathProgress({ slug, session, onLogin }) {
  const [progress, setProgress] = useState(null);
  const [needsEnrollment, setNeedsEnrollment] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const accessToken = session?.accessToken;
  const pathUrl = `/api/progress/paths/${encodeURIComponent(slug)}/`;

  useEffect(() => {
    if (!accessToken) return;

    const controller = new AbortController();

    async function loadProgress() {
      try {
        const response = await fetch(pathUrl, {
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

        if (response.status === 403) {
          setNeedsEnrollment(true);
          return;
        }

        if (!response.ok) {
          throw new Error(`Could not load progress (${response.status}).`);
        }

        const data = await response.json();

        if (!controller.signal.aborted) {
          setProgress(data);
          setNeedsEnrollment(false);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err.message || "Unable to load progress.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadProgress();

    return () => controller.abort();
  }, [accessToken, pathUrl, attempt]);

  function reloadProgress() {
    setError("");
    setLoading(true);
    setAttempt((previous) => previous + 1);
  }

  async function enroll() {
    if (saving) return;

    setSaving(true);
    setError("");

    try {
      const response = await fetch(`${pathUrl}enroll/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.status === 401) {
        setExpired(true);
        throw new Error("Your session has expired. Please log in again.");
      }

      if (!response.ok) {
        throw new Error(`Could not enrol (${response.status}). Please retry.`);
      }

      setNeedsEnrollment(false);
      reloadProgress();
    } catch (err) {
      setError(err.message || "Unable to enrol. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!session) {
    return (
      <section className="exercise-box">
        <h2>Save your progress</h2>
        <p>Log in to enrol and track your learning.</p>
        <button
          type="button"
          className="primary-link"
          onClick={onLogin}
        >
          Log in to continue
        </button>
      </section>
    );
  }

  return (
    <section className="exercise-box" aria-label="Learning progress">
      <h2>Your progress</h2>

      {loading && <p role="status">Checking your progress…</p>}

      {error && (
        <div role="alert">
          <p>{error}</p>
          <button
            type="button"
            className="back-button"
            onClick={expired ? onLogin : reloadProgress}
            disabled={loading || saving}
          >
            {expired ? "Log in again" : "Retry"}
          </button>
        </div>
      )}

      {!loading && !error && needsEnrollment && (
        <>
          <p>Enrol to start saving your progress in this learning path.</p>
          <button
            type="button"
            className="primary-link"
            onClick={enroll}
            disabled={saving}
          >
            {saving ? "Enrolling…" : "Enrol in this path"}
          </button>
        </>
      )}

      {!loading && !error && progress && (
        <div role="status">
          <p>
            {progress.completed_lessons} of {progress.total_lessons} lessons
            completed · {progress.progress_percentage}%
          </p>

          <progress
            value={progress.progress_percentage}
            max="100"
            aria-label="Path completion"
            style={{ width: "100%", marginTop: "16px" }}
          />

          {progress.is_complete && <p>Learning path completed!</p>}
        </div>
      )}
    </section>
  );
}