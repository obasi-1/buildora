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

      <footer className="home-footer">
        <div>
          <a className="brand" href="/">
            Buildora<span>.</span>
          </a>
          <p>Learn. Build. Become.</p>
        </div>

        <nav aria-label="Footer navigation">
          <a href="#learning-paths">Learning paths</a>
          <a href="#how-it-works">How it works</a>
        </nav>
      </footer>
    </div>
  );
}