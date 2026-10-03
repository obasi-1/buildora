import { useEffect, useState } from "react";
import "./App.css";
import LearningPath from "./PathDetails.jsx";
import Login from "./Login.jsx";
import Register from "./Register.jsx";
import Dashboard from "./Dashboard.jsx";
import Profile from "./Profile.jsx";
import useSession from "./sessionHook.js";

export default function App() {
  const [paths, setPaths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSlug, setSelectedSlug] = useState(null);
  const [authScreen, setAuthScreen] = useState(null);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const {
    session,
    setSession,
    restoring,
    restoreError,
    retryRestore,
    dismissRestore,
    updateUser,
  } = useSession();
  const [theme, setTheme] = useState(() => {
  try {
    const savedTheme = localStorage.getItem("buildora.theme");

    if (savedTheme === "light" || savedTheme === "dark") {
      return savedTheme;
    }
  } catch {
    // Use the device preference if storage is unavailable.
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
});

    useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;

    try {
      localStorage.setItem("buildora.theme", theme);
    } catch {
      // Theme switching still works without browser storage.
    }
  }, [theme]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadPaths() {
      try {
        const response = await fetch("/api/learning/paths/", {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Request failed (${response.status}).`);
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
          throw new Error("Unexpected catalogue response.");
        }

        if (!controller.signal.aborted) {
          setPaths(data);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err.message || "Unable to load learning paths.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadPaths();

    return () => controller.abort();
  }, []);

  function scrollToTop() {
    window.scrollTo(0, 0);
  }

  function goHome() {
    setSelectedSlug(null);
    setShowDashboard(false);
    setShowProfile(false);
    setAuthScreen(null);
    scrollToTop();
  }

  function openPath(slug) {
    setSelectedSlug(slug);
    setShowDashboard(false);
    setShowProfile(false);
    setAuthScreen(null);
    scrollToTop();
  }

  function openDashboard() {
    setSelectedSlug(null);
    setShowProfile(false);
    setAuthScreen(null);
    setShowDashboard(true);
    scrollToTop();
  }

  function openProfile() {
    setSelectedSlug(null);
    setShowDashboard(false);
    setAuthScreen(null);
    setShowProfile(true);
    scrollToTop();
  }

  function requestLogin() {
    setSession(null);
    setAuthScreen("login");
    scrollToTop();
  }

  function requestRegistration() {
    setAuthScreen("register");
    scrollToTop();
  }

  function closeAuth() {
    setAuthScreen(null);
    scrollToTop();
  }

  function logout() {
    setSession(null);
    goHome();
  }

  if (restoring || restoreError) {
    return (
      <div className="site">
        <header className="site-header">
          <span className="brand">
            Buildora<span>.</span>
          </span>
        </header>

        <main className="auth-page">
          {restoring ? (
            <p role="status">Restoring your session…</p>
          ) : (
            <div className="error-box" role="alert">
              <p>{restoreError}</p>

              <div className="header-actions">
                <button
                  type="button"
                  className="back-button"
                  onClick={retryRestore}
                >
                  Try again
                </button>

                <button
                  type="button"
                  className="back-button"
                  onClick={dismissRestore}
                >
                  Continue logged out
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  if (authScreen === "register") {
    return (
      <Register
        onBack={closeAuth}
        onLogin={() => {
          setAuthScreen("login");
          scrollToTop();
        }}
      />
    );
  }

  if (authScreen === "login") {
    return (
      <Login
        onBack={closeAuth}
        onSuccess={(newSession) => {
          setSession(newSession);
          setAuthScreen(null);
          scrollToTop();
        }}
      />
    );
  }

  if (showProfile && session) {
    return (
      <Profile
        key={session.user.id}
        onBack={goHome}
        onLogin={requestLogin}
        onSaved={updateUser}
      />
    );
  }

  if (selectedSlug) {
    return (
      <LearningPath
        key={selectedSlug}
        slug={selectedSlug}
        session={session}
        onLogin={requestLogin}
        onBack={goHome}
      />
    );
  }

  if (showDashboard && session) {
    return (
      <Dashboard
        key={`${session.user.id}-${session.accessToken}`}
        accessToken={session.accessToken}
        onBack={goHome}
        onOpenPath={openPath}
        onLogin={requestLogin}
      />
    );
  }

  return (
    <div className="site homepage">
      <header className="site-header home-header">
        <a className="brand" href="/">
          Buildora<span>.</span>
        </a>

        <nav className="home-navigation" aria-label="Main navigation">
          <a className="nav-link" href="#learning-paths">
            Learning paths
          </a>
          <a className="nav-link" href="#how-it-works">
            How it works
          </a>
        </nav>

        <div className="home-account-actions">
          {session ? (
            <>
              <button
                type="button"
                className="back-button"
                onClick={openDashboard}
              >
                My dashboard
              </button>

              <button
                type="button"
                className="back-button"
                onClick={openProfile}
              >
                My profile
              </button>

              <button
                type="button"
                className="text-button"
                onClick={logout}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="back-button"
                onClick={requestLogin}
              >
                Log in
              </button>

              <button
                type="button"
                className="primary-link header-signup"
                onClick={requestRegistration}
              >
                Create account
              </button>
            </>
          )}
        </div>
      </header>

      <main>
        <section className="hero hero-showcase home-hero">
          <div className="hero-copy">
            <p className="eyebrow">YOUR LEARNING STARTS HERE</p>

            <h1>
              Learn to code.
              <br />
              <span>Build real projects.</span>
            </h1>

            <p className="hero-description">
              Follow simple lessons, practise new skills, and build
              something of your own. Take it one step at a time.
            </p>

            <div className="home-hero-actions">
              <button
                type="button"
                className="primary-link"
                onClick={session ? openDashboard : requestRegistration}
              >
                {session ? "Go to my dashboard →" : "Create account →"}
              </button>

              <a className="back-button" href="#learning-paths">
                Explore learning paths
              </a>
            </div>

            <p className="hero-caption">
              {session
                ? `Welcome back, ${
                    session.user.first_name || session.user.username
                  }. Keep building your skills.`
                : "New to coding? Start with your first lesson."}
            </p>
          </div>

          <figure className="code-preview">
            <figcaption className="code-preview-header">
              <span className="code-window-dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span>my_first_project.py</span>
              <span className="code-language">Python</span>
            </figcaption>

            <div className="code-preview-body">
              <p className="code-comment">
                # Big ideas start with small steps.
              </p>

              <pre>
                <code>
                  <span className="code-variable">name</span>
                  {" = "}
                  <span className="code-string">"Builder"</span>
                  {"\n\n"}
                  <span className="code-function">print</span>
                  {"("}
                  <span className="code-string">
                    {'f"Hello, {name}!"'}
                  </span>
                  {")\n"}
                  <span className="code-function">print</span>
                  {"("}
                  <span className="code-string">
                    {'"This is my first step."'}
                  </span>
                  {")"}
                </code>
              </pre>
            </div>

            <div className="code-preview-output">
              <p className="output-label">WHAT YOUR PROGRAM DISPLAYS</p>
              <pre>{"Hello, Builder!\nThis is my first step."}</pre>
            </div>

            <p className="code-preview-footer">
              Learn it. Try it. Make it yours.
            </p>
          </figure>
        </section>

        <section
          id="how-it-works"
          className="home-steps-section"
          aria-labelledby="how-title"
        >
          <p className="eyebrow">GETTING STARTED</p>
          <h2 id="how-title">Your next skill starts with a small step.</h2>

          <div className="home-steps">
            <article className="home-step">
              <span className="home-step-number" aria-hidden="true">
                01
              </span>
              <h3>Create your account</h3>
              <p>
                Set up your profile so you can save your learning progress.
              </p>
            </article>

            <article className="home-step">
              <span className="home-step-number" aria-hidden="true">
                02
              </span>
              <h3>Choose a learning path</h3>
              <p>
                Follow the lessons and practise with simple exercises.
              </p>
            </article>

            <article className="home-step">
              <span className="home-step-number" aria-hidden="true">
                03
              </span>
              <h3>Build your first project</h3>
              <p>
                Put your skills to work and submit a link to what you build.
              </p>
            </article>
          </div>
        </section>

        <section
          id="learning-paths"
          className="catalogue"
          aria-labelledby="catalogue-title"
        >
          <p className="eyebrow">EXPLORE AND LEARN</p>
          <h2 id="catalogue-title">Find your starting point.</h2>

          <p className="section-description">
            Choose a path and learn one lesson at a time.
          </p>

          {loading && <p role="status">Loading learning paths…</p>}

          {error && (
            <div className="error-box" role="alert">
              <p>We couldn’t load the learning paths. {error}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
              >
                Try again
              </button>
            </div>
          )}

          {!loading && !error && paths.length === 0 && (
            <p>No learning paths have been published yet.</p>
          )}

          {!loading && !error && paths.length > 0 && (
            <div className="path-grid">
              {paths.map((path) => (
                <article className="path-card" key={path.id}>
                  <span className="card-label">LEARNING PATH</span>
                  <h3>{path.title}</h3>
                  <p>{path.description}</p>

                  <button
                    type="button"
                    className="primary-link"
                    onClick={() => openPath(path.slug)}
                  >
                    View lessons →
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        {!session && (
          <section className="home-join" aria-labelledby="join-title">
            <div>
              <h2 id="join-title">Ready to build something?</h2>
              <p>Create your account and take your first step today.</p>
            </div>

            <button
              type="button"
              className="primary-link"
              onClick={requestRegistration}
            >
              Create account →
            </button>
          </section>
        )}
      </main>

      <footer className="home-footer creator-footer">
  <div className="footer-connect">
    <div>
      <h2>Connect with the creator</h2>
      <p>Follow my development journey and explore Buildora’s code.</p>
    </div>

    <div className="footer-socials">
      <a
        href="https://www.linkedin.com/in/obasi-sam-otei-4b6688350/"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Visit Obasi-sam Otei on LinkedIn (opens in a new tab)"
      >
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M20.45 2H3.55C2.69 2 2 2.68 2 3.52v16.96C2 21.32 2.69 22 3.55 22h16.9c.86 0 1.55-.68 1.55-1.52V3.52C22 2.68 21.31 2 20.45 2ZM7.93 18.75H4.98V9.2h2.95v9.55ZM6.45 7.9a1.71 1.71 0 1 1 0-3.42 1.71 1.71 0 0 1 0 3.42Zm12.3 10.85H15.8V14.1c0-1.11-.02-2.54-1.55-2.54-1.55 0-1.79 1.21-1.79 2.46v4.73H9.51V9.2h2.83v1.3h.04c.39-.74 1.36-1.53 2.79-1.53 2.98 0 3.58 1.96 3.58 4.51v5.27Z" />
        </svg>
        LinkedIn
      </a>

      <a
        href="https://github.com/obasi-1/buildora"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="View Buildora on GitHub (opens in a new tab)"
      >
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M12 .75a11.25 11.25 0 0 0-3.56 21.92c.56.1.77-.24.77-.54v-2.1c-3.13.68-3.79-1.33-3.79-1.33-.51-1.3-1.25-1.65-1.25-1.65-1.02-.7.08-.69.08-.69 1.13.08 1.73 1.16 1.73 1.16 1 .1.94 2.08 3.28 1.48.1-.73.39-1.23.71-1.51-2.5-.28-5.13-1.25-5.13-5.56 0-1.23.44-2.23 1.16-3.02-.12-.28-.5-1.43.11-2.98 0 0 .95-.3 3.09 1.15a10.77 10.77 0 0 1 5.62 0c2.15-1.45 3.09-1.15 3.09-1.15.61 1.55.23 2.7.11 2.98.72.79 1.16 1.79 1.16 3.02 0 4.32-2.63 5.27-5.14 5.55.4.35.76 1.03.76 2.08v2.57c0 .3.2.65.78.54A11.25 11.25 0 0 0 12 .75Z" />
        </svg>
        GitHub
      </a>
    </div>
  </div>

  <div className="footer-bottom">
    <div>
      <a className="brand" href="/">
        Buildora<span>.</span>
      </a>
      <p>Learn. Build. Become.</p>
    </div>

    <nav aria-label="Footer navigation">
  <a href="#learning-paths">Learning paths</a>
  <a href="#how-it-works">How it works</a>

  <button
    type="button"
    className="theme-toggle"
    onClick={() => {
      setTheme((current) => (current === "dark" ? "light" : "dark"));
    }}
    aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
  >
    <span aria-hidden="true">
      {theme === "dark" ? "☀" : "☾"}
    </span>
    {theme === "dark" ? "Light theme" : "Dark theme"}
  </button>
</nav>

    <p className="footer-copyright">
      © {new Date().getFullYear()} Buildora.
      Built by Obasi-sam Otei.
    </p>
  </div>
</footer>
    </div>
  );
}