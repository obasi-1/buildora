const PYODIDE_URL =
  "https://cdn.jsdelivr.net/pyodide/v314.0.7/full/";

const OUTPUT_LIMIT = 20000;

let pythonPromise = null;
let busy = false;

function loadPython() {
  if (!pythonPromise) {
    pythonPromise = (async () => {
      const { loadPyodide } = await import(
        `${PYODIDE_URL}pyodide.mjs`
      );

      return loadPyodide({
        indexURL: PYODIDE_URL,
      });
    })().catch((error) => {
      pythonPromise = null;
      throw error;
    });
  }

  return pythonPromise;
}

function reportError(error) {
  self.postMessage({
    type: "error",
    message: String(
      error?.message || "Python could not run. Please try again."
    ).slice(0, OUTPUT_LIMIT),
  });
}

self.onmessage = async (event) => {
  const request = event.data;

  if (!request || busy) return;

  // Prepare Python before the learner clicks Run.
  if (request.type === "init") {
    busy = true;

    try {
      self.postMessage({
        type: "status",
        message: "Preparing Python…",
      });

      await loadPython();

      self.postMessage({
        type: "ready",
      });
    } catch (error) {
      reportError(error);
    } finally {
      busy = false;
    }

    return;
  }

  if (request.type !== "run") return;

  const { code, stdin = "" } = request;

  if (typeof code !== "string" || typeof stdin !== "string") {
    reportError(new Error("The code and input must be text."));
    return;
  }

  busy = true;

  let globals;
  let result;
  let outputLength = 0;
  let outputLimited = false;

  function sendOutput(text) {
    if (outputLimited) return;

    const remaining = OUTPUT_LIMIT - outputLength;
    const visibleText = text.slice(0, remaining);

    if (visibleText) {
      self.postMessage({
        type: "output",
        text: visibleText,
      });

      outputLength += visibleText.length;
    }

    if (text.length > remaining) {
      outputLimited = true;

      self.postMessage({
        type: "output",
        text: "\n[Output limit reached. Further output is hidden.]\n",
      });
    }
  }

  try {
    const pyodide = await loadPython();

    // Set fresh output handlers and input for this run.
    pyodide.setStdout({
      batched: (text) => sendOutput(`${text}\n`),
    });

    pyodide.setStderr({
      batched: (text) => sendOutput(`${text}\n`),
    });

    const inputLines =
      stdin === ""
        ? []
        : stdin.replace(/\r\n?/g, "\n").split("\n");

    let inputIndex = 0;

    pyodide.setStdin({
      stdin: () => {
        if (inputIndex >= inputLines.length) return null;
        return inputLines[inputIndex++];
      },
    });

    // Start with fresh script variables for each run.
    globals = pyodide.runPython(
      '{"__name__": "__main__"}'
    );

    self.postMessage({
      type: "running",
    });

    result = await pyodide.runPythonAsync(code, {
      globals,
      filename: "main.py",
    });

    self.postMessage({
      type: "done",
    });
  } catch (error) {
    reportError(error);
  } finally {
    try {
      if (result && typeof result.destroy === "function") {
        result.destroy();
      }

      globals?.destroy();
    } finally {
      busy = false;
    }
  }
};