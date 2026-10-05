import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
} from "react";
import { apiFetch } from "./sessionHook.js";
import PathProjects from "./PathProjects.jsx";

const PythonPlayground = lazy(
  () => import("./PythonPlayground.jsx")
);

async function readResponse(response) {
  const data = await response.json();

  if (!response.ok) {
    const error = new Error(
      response.status === 401
        ? "Your session has expired. Please log in again."
        : data.detail || `Request failed (${response.status}).`
    );

    error.status = response.status;
    throw error;
  }

  return data;
}

function PathLessons({ path, session, onLogin }) {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(Boolean(session));
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [expired, setExpired] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [practiceLesson, setPracticeLesson] = useState(null);

  const controllerRef = useRef(null);
  const savingRef = useRef(false);

  const loggedIn = Boolean(session?.accessToken);
  const progressUrl =
    `/api/progress/paths/${encodeURIComponent(path.slug)}/`;

  useEffect(() => {
    const controller = new AbortController();
    controllerRef.current = controller;

    async function loadProgress() {
      if (!loggedIn) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      setExpired(false);

      try {
        const response = await apiFetch(progressUrl, {
          signal: controller.signal,
        });

        const data = await response.json();

        if (controller.signal.aborted) return;

        if (
          response.status === 403 &&
          data.detail === "Enrol in this learning path first."
        ) {
          setProgress(null);
          return;
        }

        if (!response.ok) {
          const requestError = new Error(
            response.status === 401
              ? "Your session has expired. Please log in again."
              : data.detail || "Unable to load your progress."
          );

          requestError.status = response.status;
          throw requestError;
        }

        if (!Array.isArray(data.completed_lesson_ids)) {
          throw new Error(
            "The progress response is missing completed lesson IDs. " +
            "Check that the backend update was saved."
          );
        }

        setProgress(data);
      } catch (err) {
        if (!controller.signal.aborted && err.name !== "AbortError") {
          setExpired(err.status === 401);
          setError(err.message || "Unable to load your progress.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadProgress();

    return () => controller.abort();
  }, [loggedIn, progressUrl, attempt]);

  async function saveProgress(lessonId = null) {
    if (
      savingRef.current ||
      loading ||
      error ||
      !loggedIn ||
      (lessonId !== null && !progress)
    ) {
      return;
    }

    const signal = controllerRef.current?.signal;

    if (!signal || signal.aborted) return;

    savingRef.current = true;
    setBusy(lessonId === null ? "enrol" : lessonId);
    setError("");
    setMessage("");

    let saved = false;

    try {
      const url =
        lessonId === null
          ? `${progressUrl}enroll/`
          : `/api/progress/lessons/${lessonId}/complete/`;

      const result = await readResponse(
        await apiFetch(url, {
          method: "POST",
          signal,
        })
      );

      saved = true;

      const updated = await readResponse(
        await apiFetch(progressUrl, { signal })
      );

      if (signal.aborted) return;

      if (!Array.isArray(updated.completed_lesson_ids)) {
        throw new Error(
          "The progress response is missing completed lesson IDs."
        );
      }

      setProgress(updated);

      setMessage(
        lessonId === null
          ? "You are enrolled. Choose a lesson below to begin."
          : result.created
            ? "Lesson marked complete. Your progress is updated."
            : "This lesson was already completed."
      );
    } catch (err) {
      if (!signal.aborted && err.name !== "AbortError") {
        setExpired(err.status === 401);

        setError(
          err.status === 401
            ? err.message
            : saved
              ? "Your change was saved, but progress could not be " +
                "reloaded. Click Reload progress."
              : `${err.message || "Unable to connect."} ` +
                "Reload progress to check whether the change was saved."
        );
      }
    } finally {
      savingRef.current = false;

      if (!signal.aborted) {
        setBusy(null);
      }
    }
  }

  function reloadProgress() {
    setLoading(true);
    setError("");
    setMessage("");
    setAttempt((previous) => previous + 1);
  }

  const completedIds = new Set(
    progress?.completed_lesson_ids || []
  );

  const saving = busy !== null;
  const progressReady =
    loggedIn && !loading && !error && !expired && Boolean(progress);

    if (practiceLesson) {
  return (
    <Suspense fallback={<p role="status">Loading editor…</p>}>
      <PythonPlayground
        key={`${session?.user?.id ?? "guest"}-${practiceLesson.id}`}
        lesson={practiceLesson}
        userId={session?.user?.id}
        onBack={() => {
          setPracticeLesson(null);
          window.scrollTo(0, 0);
        }}
      />
    </Suspense>
  );
}
  return (
    <>
      <section className="exercise-box" aria-label="Your progress">
        <h2>{loggedIn ? "Your progress" : "Save your progress"}</h2>

        {!loggedIn && (
          <>
            <p>Log in to enrol and track your learning.</p>
            <button
              type="button"
              className="primary-link"
              onClick={onLogin}
            >
              Log in to continue
            </button>
          </>
        )}

        {loggedIn && (
          <>
            {loading && (
              <p role="status">Loading your progress…</p>
            )}

            {message && <p role="status">{message}</p>}

            {error && (
              <div className="error-box" role="alert">
                <p>{error}</p>

                <button
                  type="button"
                  className="back-button"
                  disabled={saving}
                  onClick={expired ? onLogin : reloadProgress}
                >
                  {expired ? "Log in again" : "Reload progress"}
                </button>
              </div>
            )}

            {!loading && !error && !progress && (
              <>
                <p>Enrol to start saving your learning progress.</p>
                <button
                  type="button"
                  className="primary-link"
                  disabled={saving}
                  onClick={() => saveProgress()}
                >
                  {saving ? "Enrolling…" : "Enrol in this path"}
                </button>
              </>
            )}

            {progressReady && (
              <>
                <p>
                  {progress.completed_lessons} of{" "}
                  {progress.total_lessons} lessons completed —{" "}
                  {progress.progress_percentage}%
                </p>

                <progress
                  className="dashboard-progress"
                  aria-label="Learning path completion"
                  value={progress.progress_percentage}
                  max="100"
                />

                <p>
                  {progress.is_complete
                    ? "You have completed all published lessons in this path."
                    : "Mark each lesson complete after finishing its exercise."}
                </p>
              </>
            )}
          </>
        )}
      </section>

      {path.modules.length === 0 && (
        <p>No modules have been added yet.</p>
      )}

      {path.modules.map((module, index) => (
        <section className="module-section" key={module.id}>
          <p className="eyebrow">MODULE {index + 1}</p>
          <h2>{module.title}</h2>

          {module.description && (
            <p className="section-description">
              {module.description}
            </p>
          )}

          {module.lessons.length === 0 && (
            <p>No published lessons in this module yet.</p>
          )}

          {module.lessons.map((lesson) => {
            const completed =
              progressReady && completedIds.has(lesson.id);

            return (
              <article className="lesson-card" key={lesson.id}>
                <div className="lesson-heading">
                  <h3>{lesson.title}</h3>

                  {completed && (
                    <span className="completion-badge">
                      ✓ Completed
                    </span>
                  )}
                </div>

                <div className="lesson-content">
                  {lesson.content}
                </div>

                {lesson.resource_url &&
                  /^https?:\/\//i.test(lesson.resource_url) && (
                    <a
                      className="resource-link"
                      href={lesson.resource_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open learning resource ↗
                    </a>
                  )}

                {lesson.exercise && (
  <div className="exercise-box">
    <h4>Try it yourself</h4>
    <p>{lesson.exercise}</p>

    {path.slug === "python-foundation" && (
      <button
        type="button"
        className="primary-link"
        onClick={() => {
          setPracticeLesson(lesson);
          window.scrollTo(0, 0);
        }}
      >
        Open Python editor →
      </button>
    )}
  </div>
)}

                {progressReady && (
                  <div className="lesson-actions">
                    <button
                      type="button"
                      className="primary-link"
                      disabled={saving || completed}
                      aria-label={
                        completed
                          ? `${lesson.title} completed`
                          : `Mark ${lesson.title} complete`
                      }
                      onClick={() => saveProgress(lesson.id)}
                    >
                      {completed
                        ? "✓ Completed"
                        : busy === lesson.id
                          ? "Saving…"
                          : "Mark complete"}
                    </button>
                  </div>
                )}
              </article>
            );
          })}
                </section>
      ))}

      <PathProjects
        slug={path.slug}
        session={session}
        enrolled={Boolean(progress)}
        onLogin={onLogin}
      />
    </>
  );
}

export default function LearningPath({
  slug,
  onBack,
  session,
  onLogin,
}) {
  const [path, setPath] = useState(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadPath() {
      setPath(null);
      setError("");

      try {
        const response = await fetch(
          `/api/learning/paths/${encodeURIComponent(slug)}/`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error(
            response.status === 404
              ? "This learning path is unavailable."
              : `Request failed (${response.status}).`
          );
        }

        const data = await response.json();

        if (!Array.isArray(data.modules)) {
          throw new Error("Unexpected learning path response.");
        }

        if (!controller.signal.aborted) {
          setPath(data);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err.message || "Unable to load lessons.");
        }
      }
    }

    loadPath();

    return () => controller.abort();
  }, [slug, attempt]);

  return (
    <div className="site">
      <header className="site-header">
        <a className="brand" href="/">
          Buildora<span>.</span>
        </a>

        <button
          type="button"
          className="back-button"
          onClick={onBack}
        >
          ← All learning paths
        </button>
      </header>

      <main className="learning-detail">
        {!path && !error && (
          <p role="status">Loading lessons…</p>
        )}

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

        {path && (
          <>
            <p className="eyebrow">YOUR LEARNING PATH</p>
            <h1 className="path-title">{path.title}</h1>

            <p className="section-description">
              {path.description}
            </p>

            <PathLessons
              key={`${path.slug}-${session?.user?.id ?? "guest"}-${session?.accessToken ?? ""}`}
              path={path}
              session={session}
              onLogin={onLogin}
            />
          </>
        )}
      </main>

      <footer>Buildora · Learn. Build. Become.</footer>
    </div>
  );
}