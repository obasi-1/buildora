import { useEffect, useState } from "react";
import { apiFetch } from "./sessionHook.js";

export default function LearningProgress({
  slug,
  lessons,
  accessToken,
  onLogin,
}) {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [expired, setExpired] = useState(false);
  const [lessonId, setLessonId] = useState("");
  const [attempt, setAttempt] = useState(0);

  const progressUrl =
    `/api/progress/paths/${encodeURIComponent(slug)}/`;

  useEffect(() => {
    const controller = new AbortController();

    async function loadProgress() {
      try {
        const response = await fetch(progressUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          signal: controller.signal,
        });

        const data = await response.json();

        if (controller.signal.aborted) return;

        if (response.status === 401) {
          setExpired(true);
          throw new Error("Your session has expired. Please log in again.");
        }

        if (
          response.status === 403 &&
          data.detail === "Enrol in this learning path first."
        ) {
          setProgress(null);
          return;
        }

        if (!response.ok) {
          throw new Error(data.detail || "Unable to load your progress.");
        }

        setProgress(data);
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

    loadProgress();

    return () => controller.abort();
  }, [progressUrl, accessToken, attempt]);

  async function authenticatedRequest(url, method) {
    const response = await apiFetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.status === 401) {
      setExpired(true);
      throw new Error("Your session has expired. Please log in again.");
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || `Request failed (${response.status}).`);
    }

    return data;
  }

  async function saveProgress(action) {
    if (busy) return;

    setBusy(true);
    setError("");
    setMessage("");

    try {
      if (action === "enrol") {
        await authenticatedRequest(`${progressUrl}enroll/`, "POST");
        setMessage("You are enrolled in this learning path.");
      } else {
        const result = await authenticatedRequest(
          `/api/progress/lessons/${lessonId}/complete/`,
          "POST"
        );

        setMessage(
          result.created
            ? "Lesson marked complete."
            : "You have already completed this lesson."
        );
      }

      const updated = await authenticatedRequest(progressUrl, "GET");
      setProgress(updated);
    } catch (err) {
      setError(
        `${err.message || "Unable to connect."} ` +
        "If you clicked a save button, check your progress before retrying."
      );
    } finally {
      setBusy(false);
    }
  }

  function retry() {
    setLoading(true);
    setError("");
    setMessage("");
    setAttempt((previous) => previous + 1);
  }

  return (
    <section className="exercise-box" aria-label="Your progress">
      <h2>Your progress</h2>

      {loading && <p role="status">Loading your progress…</p>}

      {message && <p role="status">{message}</p>}

      {error && (
        <div className="error-box" role="alert">
          <p>{error}</p>

          {expired ? (
            <button type="button" onClick={onLogin}>
              Log in again
            </button>
          ) : (
            <button type="button" onClick={retry} disabled={busy}>
              Reload progress
            </button>
          )}
        </div>
      )}

      {!loading && !error && !progress && (
        <>
          <p>Enrol to start saving your learning progress.</p>

          <button
            type="button"
            className="primary-link"
            disabled={busy}
            onClick={() => saveProgress("enrol")}
          >
            {busy ? "Enrolling…" : "Enrol in this path"}
          </button>
        </>
      )}

      {!loading && progress && !expired && (
        <>
          <p>
            {progress.completed_lessons} of {progress.total_lessons} lessons
            completed — {progress.progress_percentage}%
          </p>

          <progress
            aria-label="Learning path completion"
            value={progress.progress_percentage}
            max="100"
            style={{ width: "100%", marginTop: "16px" }}
          />

          {progress.is_complete ? (
            <p>You have completed all published lessons in this path.</p>
          ) : lessons.length > 0 ? (
            <form
              className="auth-form"
              onSubmit={(event) => {
                event.preventDefault();
                if (lessonId) saveProgress("complete");
              }}
            >
              <label htmlFor="completed-lesson">
                Which lesson have you finished?
              </label>

              <select
                id="completed-lesson"
                value={lessonId}
                onChange={(event) => setLessonId(event.target.value)}
                required
                disabled={busy || Boolean(error)}
              >
                <option value="">Choose a lesson</option>

                {lessons.map((lesson) => (
                  <option key={lesson.id} value={lesson.id}>
                    {lesson.title}
                  </option>
                ))}
              </select>

              <button
                type="submit"
                className="primary-link"
                disabled={busy || !lessonId || Boolean(error)}
              >
                {busy ? "Saving…" : "Mark complete"}
              </button>
            </form>
          ) : (
            <p>There are no published lessons to complete yet.</p>
          )}
        </>
      )}
    </section>
  );
}    