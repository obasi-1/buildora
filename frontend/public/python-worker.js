const PYODIDE_URL =
  "https://cdn.jsdelivr.net/pyodide/v314.0.7/full/";

const OUTPUT_LIMIT = 20000;

let started = false;

self.onmessage = async (event) => {
  if (event.data?.type !== "run" || started) return;

  started = true;

  const { code, stdin = "" } = event.data;

  if (typeof code !== "string" || typeof stdin !== "string") {
    self.postMessage({
      type: "error",
      message: "The code and input must be text.",
    });
    return;
  }

  let outputLength = 0;
  let outputLimited = false;
  let globals;

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
    self.postMessage({
      type: "status",
      message: "Loading Python…",
    });

    const { loadPyodide } = await import(
      `${PYODIDE_URL}pyodide.mjs`
    );

    const pyodide = await loadPyodide({
      indexURL: PYODIDE_URL,
      stdout: (text) => sendOutput(`${text}\n`),
      stderr: (text) => sendOutput(`${text}\n`),
    });

    // Supply one line for each call to Python's input().
    const inputLines =
      stdin === "" ? [] : stdin.replace(/\r\n?/g, "\n").split("\n");

    let inputIndex = 0;

    pyodide.setStdin({
      stdin: () => {
        if (inputIndex >= inputLines.length) return null;
        return inputLines[inputIndex++];
      },
    });

    globals = pyodide.runPython(
      '{"__name__": "__main__"}'
    );

    self.postMessage({
      type: "running",
    });

    const result = await pyodide.runPythonAsync(code, {
      globals,
      filename: "main.py",
    });

    if (result && typeof result.destroy === "function") {
      result.destroy();
    }

    self.postMessage({
      type: "done",
    });
  } catch (error) {
    self.postMessage({
      type: "error",
      message: String(
        error?.message || "Python could not run. Please try again."
      ).slice(0, OUTPUT_LIMIT),
    });
  } finally {
    globals?.destroy();
  }
};