import { useEffect, useRef, useState } from "react";
import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";

const extensions = [
  python(),
  EditorView.contentAttributes.of({
    "aria-label": "Python code editor",
  }),
];

const STARTER_CODE =
  '# Write your Python code here.\nprint("Hello, Buildora!")\n';

function readDraft(key) {
  try {
    return localStorage.getItem(key) ?? STARTER_CODE;
  } catch {
    return STARTER_CODE;
  }
}

export default function PythonPlayground({
  lesson,
  userId,
  onBack,
}) {
  const draftKey =
    `buildora.python.${userId ?? "guest"}.${lesson.id}`;

  const [code, setCode] = useState(() => readDraft(draftKey));
  const [stdin, setStdin] = useState("");
  const [output, setOutput] = useState("");
  const [phase, setPhase] = useState("loading");
  const [status, setStatus] = useState("Preparing Python…");
  const [error, setError] = useState("");
  const [draftStatus, setDraftStatus] = useState("");
  const [restart, setRestart] = useState(0);

  const [theme, setTheme] = useState(() =>
    document.documentElement.dataset.theme === "dark"
      ? "dark"
      : "light"
  );

  const workerRef = useRef(null);
  const timerRef = useRef(null);
  const phaseRef = useRef("loading");

  const running = phase === "running";
  const preparing = phase === "loading";

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setTheme(
        document.documentElement.dataset.theme === "dark"
          ? "dark"
          : "light"
      );
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let worker;
    let disposed = false;

    phaseRef.current = "loading";
    setPhase("loading");
    setStatus("Preparing Python…");

    function isCurrent() {
      return !disposed && workerRef.current === worker;
    }

    function fail(message) {
      if (disposed) return;

      clearTimeout(timerRef.current);
      worker?.terminate();
      workerRef.current = null;
      phaseRef.current = "failed";

      setPhase("failed");
      setStatus("Python needs to restart.");
      setError(message);
    }

    try {
      worker = new Worker(
        `${import.meta.env.BASE_URL}python-worker.js`,
        { type: "module" }
      );

      workerRef.current = worker;

      timerRef.current = setTimeout(() => {
        if (!isCurrent()) return;

        fail(
          "Python took too long to load. Check your connection, then click Retry Python."
        );
      }, 90000);

      worker.onmessage = (event) => {
        if (!isCurrent()) return;

        const data = event.data;

        if (data.type === "status") {
          if (phaseRef.current === "loading") {
            setStatus(data.message);
          }
          return;
        }

        if (data.type === "ready") {
          if (phaseRef.current !== "loading") return;

          clearTimeout(timerRef.current);
          phaseRef.current = "ready";

          setPhase("ready");
          setStatus("Python is ready. Run your code.");
          return;
        }

        if (data.type === "running") {
          if (phaseRef.current === "running") {
            setStatus("Running…");
          }
          return;
        }

        if (data.type === "output") {
          if (phaseRef.current === "running") {
            setOutput((previous) =>
              (previous + data.text).slice(0, 24000)
            );
          }
          return;
        }

        if (data.type === "done") {
          if (phaseRef.current !== "running") return;

          clearTimeout(timerRef.current);
          phaseRef.current = "ready";

          setPhase("ready");
          setStatus("Finished.");

          // Keep the worker alive for the next run.
          return;
        }

        if (data.type === "error") {
          const wasRunning = phaseRef.current === "running";

          fail(data.message || "Python could not run.");

          // After a code error, prepare a fresh engine.
          // Loading failures require a manual retry.
          if (wasRunning) {
            setRestart((previous) => previous + 1);
          }
        }
      };

      worker.onerror = (event) => {
        event.preventDefault();

        if (!isCurrent()) return;

        fail(
          "The Python runner encountered a problem. Click Retry Python."
        );
      };

      worker.onmessageerror = () => {
        if (!isCurrent()) return;

        fail(
          "Unable to read Python's response. Click Retry Python."
        );
      };

      // Start loading as soon as the editor opens.
      worker.postMessage({ type: "init" });
    } catch (err) {
      fail(err.message || "Unable to prepare Python.");
    }

    return () => {
      disposed = true;
      clearTimeout(timerRef.current);
      worker?.terminate();

      if (workerRef.current === worker) {
        workerRef.current = null;
      }
    };
  }, [restart]);

  function changeCode(value) {
    setCode(value);

    try {
      localStorage.setItem(draftKey, value);
      setDraftStatus("Draft saved in this browser.");
    } catch {
      setDraftStatus(
        "Draft could not be saved. Download your code to keep it."
      );
    }
  }

  function restartPython() {
    clearTimeout(timerRef.current);
    workerRef.current?.terminate();
    workerRef.current = null;
    phaseRef.current = "loading";

    setPhase("loading");
    setStatus("Preparing Python…");
    setRestart((previous) => previous + 1);
  }

  function stopRun() {
    if (phaseRef.current !== "running") return;

    setError("");
    restartPython();
  }

  function runCode() {
    const worker = workerRef.current;

    if (
      !worker ||
      phaseRef.current !== "ready" ||
      !code.trim()
    ) {
      return;
    }

    phaseRef.current = "running";
    setPhase("running");
    setOutput("");
    setError("");
    setStatus("Running…");

    clearTimeout(timerRef.current);

    // Start the timer immediately, including message delivery time.
    timerRef.current = setTimeout(() => {
      if (
        workerRef.current !== worker ||
        phaseRef.current !== "running"
      ) {
        return;
      }

      setError(
        "Execution stopped after 10 seconds. Check for an endless loop."
      );

      restartPython();
    }, 10000);

    try {
      worker.postMessage({
        type: "run",
        code,
        stdin,
      });
    } catch (err) {
      clearTimeout(timerRef.current);
      worker.terminate();
      workerRef.current = null;
      phaseRef.current = "failed";

      setPhase("failed");
      setStatus("Python needs to restart.");
      setError(err.message || "Unable to run your code.");
    }
  }

  function downloadCode() {
    const blob = new Blob([code], {
      type: "text/plain;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `buildora-lesson-${lesson.id}.py`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function leaveEditor() {
    clearTimeout(timerRef.current);
    workerRef.current?.terminate();
    workerRef.current = null;
    onBack();
  }

  return (
    <section
      className="python-playground"
      aria-label="Python practice workspace"
    >
      <div className="playground-heading">
        <div>
          <p className="eyebrow">BUILDORA PRACTICE</p>
          <h2>{lesson.title}</h2>
        </div>

        <button
          type="button"
          className="back-button"
          onClick={leaveEditor}
        >
          ← Back to lesson
        </button>
      </div>

      {lesson.exercise && (
        <div className="exercise-box">
          <h3>Your exercise</h3>
          <p>{lesson.exercise}</p>
        </div>
      )}

      <div className="playground-toolbar">
        <button
          type="button"
          className="primary-link"
          onClick={runCode}
          disabled={phase !== "ready" || !code.trim()}
        >
          {preparing
            ? "Preparing Python…"
            : running
              ? "Running…"
              : "▶ Run code"}
        </button>

        <button
          type="button"
          className="back-button"
          onClick={stopRun}
          disabled={!running}
        >
          ■ Stop
        </button>

        {phase === "failed" && (
          <button
            type="button"
            className="back-button"
            onClick={() => {
              setError("");
              restartPython();
            }}
          >
            Retry Python
          </button>
        )}

        <button
          type="button"
          className="back-button"
          onClick={downloadCode}
        >
          Download code
        </button>

        <p role="status">{status}</p>
      </div>

      <div className="playground-grid">
        <section
          className="playground-panel"
          aria-label="Code"
        >
          <h3>main.py</h3>

          <CodeMirror
            value={code}
            height="420px"
            theme={theme}
            extensions={extensions}
            onChange={changeCode}
            editable={!running}
            indentWithTab={false}
          />

          <p className="profile-note">
            {draftStatus ||
              "Your edits will be saved in this browser."}
          </p>
        </section>

        <section
          className="playground-panel"
          aria-label="Program output"
        >
          <h3>Output</h3>

          <pre
            className="playground-output"
            tabIndex={0}
            aria-label="Python output"
          >
            {output ||
              (status === "Finished."
                ? "Your code finished without printing any output."
                : "Your results will appear here.")}
          </pre>

          {error && (
            <div className="error-box" role="alert">
              <pre className="playground-error">
                {error}
              </pre>
            </div>
          )}
        </section>
      </div>

      <div className="auth-form">
        <label htmlFor="python-input">
          Program input (optional)
        </label>

        <textarea
          id="python-input"
          rows={4}
          value={stdin}
          onChange={(event) => setStdin(event.target.value)}
          disabled={running}
          placeholder={"Sam\n25"}
          aria-describedby="python-input-help"
        />

        <p id="python-input-help" className="profile-note">
          If your code uses input(), enter one answer per line
          before clicking Run.
        </p>
      </div>

      <p className="profile-note">
        Python prepares when you open the editor. You can type
        while it loads. Later runs reuse the loaded engine;
        stopping a program prepares a fresh one.
        Running code does not automatically mark the lesson complete.
      </p>
    </section>
  );
}