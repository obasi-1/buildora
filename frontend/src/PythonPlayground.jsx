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
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Ready to run.");
  const [error, setError] = useState("");
  const [draftStatus, setDraftStatus] = useState("");
  const [theme, setTheme] = useState(() =>
    document.documentElement.dataset.theme === "dark"
      ? "dark"
      : "light"
  );

  const workerRef = useRef(null);
  const timerRef = useRef(null);

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
    return () => {
      clearTimeout(timerRef.current);
      workerRef.current?.terminate();
    };
  }, []);

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

  function stopRun() {
    clearTimeout(timerRef.current);
    workerRef.current?.terminate();
    workerRef.current = null;

    setBusy(false);
    setStatus("Stopped.");
  }

  function runCode() {
    if (workerRef.current || !code.trim()) return;

    setOutput("");
    setError("");
    setBusy(true);
    setStatus("Loading Python…");

    let worker;

    function finish(message) {
      clearTimeout(timerRef.current);
      worker?.terminate();

      if (workerRef.current === worker) {
        workerRef.current = null;
      }

      setBusy(false);
      setStatus(message);
    }

    try {
      worker = new Worker(
        `${import.meta.env.BASE_URL}python-worker.js`,
        { type: "module" }
      );

      workerRef.current = worker;

      // Allow extra time for the initial Python download.
      timerRef.current = setTimeout(() => {
        setError(
          "Python took too long to load. Check your connection and try again."
        );
        finish("Loading timed out.");
      }, 90000);

      worker.onmessage = (event) => {
        if (workerRef.current !== worker) return;

        const data = event.data;

        if (data.type === "status") {
          setStatus(data.message);
        }

        if (data.type === "running") {
          clearTimeout(timerRef.current);
          setStatus("Running…");

          // Stop code that runs for longer than 10 seconds.
          timerRef.current = setTimeout(() => {
            setError(
              "Your code ran for more than 10 seconds. Check for an endless loop."
            );
            finish("Execution time limit reached.");
          }, 10000);
        }

        if (data.type === "output") {
          setOutput((previous) =>
            (previous + data.text).slice(0, 24000)
          );
        }

        if (data.type === "done") {
          finish("Finished.");
        }

        if (data.type === "error") {
          setError(data.message);
          finish("Could not finish running.");
        }
      };

      worker.onerror = (event) => {
        event.preventDefault();

        if (workerRef.current !== worker) return;

        setError(
          "The Python runner could not start. Check your connection and try again."
        );
        finish("Runner error.");
      };

      worker.onmessageerror = () => {
        if (workerRef.current !== worker) return;

        setError("Unable to read the runner's response.");
        finish("Runner error.");
      };

      worker.postMessage({
        type: "run",
        code,
        stdin,
      });
    } catch (err) {
      setError(err.message || "Unable to start Python.");
      finish("Runner error.");
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
          onClick={() => {
            stopRun();
            onBack();
          }}
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
          disabled={busy || !code.trim()}
        >
          {busy ? "Working…" : "▶ Run code"}
        </button>

        <button
          type="button"
          className="back-button"
          onClick={stopRun}
          disabled={!busy}
        >
          ■ Stop
        </button>

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
            editable={!busy}
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
          disabled={busy}
          placeholder={"Sam\n25"}
          aria-describedby="python-input-help"
        />

        <p id="python-input-help" className="profile-note">
          If your code uses input(), enter one answer per line
          before clicking Run.
        </p>
      </div>

      <p className="profile-note">
        Python may take a little time to download on the first run.
        Running code does not automatically mark the lesson complete.
      </p>
    </section>
  );
}