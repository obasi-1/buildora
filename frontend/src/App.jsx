import { useEffect, useState } from "react";
import "./App.css";
import LearningPath from "./PathDetails.jsx";
import Login from "./Login.jsx";
import Dashboard from "./Dashboard.jsx";
import useSession from "./sessionHook.js";
import Profile from "./Profile.jsx";

export default function App() {
  const [paths, setPaths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSlug, setSelectedSlug] = useState(null);
  const {
  session,
  setSession,
  restoring,
  restoreError,
  retryRestore,
  dismissRestore,
  updateUser, 
} = useSession();
  const [showLogin, setShowLogin] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

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

  function goHome() {
  setSelectedSlug(null);
  setShowDashboard(false);
  setShowLogin(false);
  setShowProfile(false);
  window.scrollTo(0, 0);
}

  function openPath(slug) {
    setSelectedSlug(slug);
    setShowDashboard(false);
    window.scrollTo(0, 0);
  }

  function requestLogin() {
    setSession(null);
    setShowLogin(true);
    window.scrollTo(0, 0);
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

  if (showLogin) {
    return (
      <Login
        onBack={() => {
          setShowLogin(false);
          window.scrollTo(0, 0);
        }}
        onSuccess={(newSession) => {
          setSession(newSession);
          setShowLogin(false);
          window.scrollTo(0, 0);
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
    <div className="site">
      <header className="site-header">
        <a className="brand" href="/">
          Buildora<span>.</span>
        </a>

        <nav className="header-actions" aria-label="Main navigation">
          <a className="nav-link" href="#learning-paths">
            Explore learning paths
          </a>

          {session ? (
            <>
              <button
                type="button"
                className="back-button"
                onClick={() => {
                  setShowDashboard(true);
                  window.scrollTo(0, 0);
                }}
              >
                My dashboard
              </button>
              <button
  type="button"
  className="back-button"
  onClick={() => {
    setSelectedSlug(null);
    setShowDashboard(false);
    setShowProfile(true);
    window.scrollTo(0, 0);
  }}
>
  My profile
</button>

              <span>
                Hi, {session.user.first_name || session.user.username}
              </span>

              <button
                type="button"
                className="back-button"
                onClick={logout}
              >
                Log out
              </button>
            </>
          ) : (
            <button
              type="button"
              className="back-button"
              onClick={requestLogin}
            >
              Log in
            </button>
          )}
        </nav>
      </header>

      <main>
        <section className="hero hero-showcase">
  <div className="hero-copy">
    <p className="eyebrow">LEARN BY CREATING</p>

    <h1>
      Small steps.
      <br />
      Real skills.
      <br />
      <span>Your next build.</span>
    </h1>

    <p className="hero-description">
      Discover guided lessons, practise what you learn,
      and turn your ideas into working projects.
    </p>

    <a className="primary-link" href="#learning-paths">
      Find your starting point →
    </a>

    <p className="hero-caption">
      Read a lesson. Try an exercise. Build something yours.
    </p>
  </div>

  <figure className="code-preview">
    <figcaption className="code-preview-header">
      <span className="code-window-dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>

      <span>introduction.py</span>
      <span className="code-language">Python</span>
    </figcaption>

    <div className="code-preview-body">
      <p className="code-comment"># Every developer starts somewhere.</p>

      <pre>
        <code>
          <span className="code-variable">name</span>
          {" = "}
          <span className="code-string">"Builder"</span>
          {"\n"}
          <span className="code-variable">project</span>
          {" = "}
          <span className="code-string">"my first app"</span>
          {"\n\n"}
          <span className="code-function">print</span>
          {"("}
          <span className="code-string">{'f"Hello, {name}!"'}</span>
          {")\n"}
          <span className="code-function">print</span>
          {"("}
          <span className="code-string">
            {'f"I am building {project}."'}
          </span>
          {")"}
        </code>
      </pre>
    </div>

    <div className="code-preview-output">
      <p className="output-label">EXAMPLE OUTPUT</p>
      <pre>{"Hello, Builder!\nI am building my first app."}</pre>
    </div>

    <p className="code-preview-footer">
      From your first line to your first project.
    </p>
  </figure>
</section>

        <section id="learning-paths" className="catalogue">
          <p className="eyebrow">YOUR LEARNING JOURNEY</p>
          <h2>Choose a learning path</h2>

          <p className="section-description">
            Build your foundation, one lesson at a time.
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
      </main>

      <footer>Buildora · Learn. Build. Become.</footer>
    </div>
  );
}