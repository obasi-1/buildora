import { useEffect, useId, useRef, useState } from "react";

export default function SiteHeader({
  session,
  theme,
  onToggleTheme,
  onNavigate,
  onBack,
  onLogout,
  showBack = false,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const menuRef = useRef(null);
  const menuButtonRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;

    function handleOutsideClick(event) {
      if (!menuRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    }

    function handleNavigation() {
      setMenuOpen(false);
    }

    document.addEventListener("pointerdown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("popstate", handleNavigation);
    window.addEventListener("hashchange", handleNavigation);

    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("popstate", handleNavigation);
      window.removeEventListener("hashchange", handleNavigation);
    };
  }, [menuOpen]);

  function visit(destination) {
    setMenuOpen(false);
    onNavigate(destination);
  }

  return (
    <header className="buildora-header">
      <div className="buildora-header-left">
        {showBack && (
          <button
            type="button"
            className="buildora-back"
            onClick={() => {
              setMenuOpen(false);
              onBack();
            }}
            aria-label="Go back"
          >
            <span aria-hidden="true">←</span>
            Back
          </button>
        )}

        <button
          type="button"
          className="buildora-logo-button"
          onClick={() => visit("#home")}
          aria-label="Buildora home"
        >
          <img
            src="/buildora-logo.png"
            alt=""
            width="44"
            height="44"
          />
        </button>
      </div>

      <div className="buildora-header-right">
        <button
          type="button"
          className="buildora-theme-button"
          onClick={onToggleTheme}
          aria-label={`Switch to ${
            theme === "dark" ? "light" : "dark"
          } theme`}
          title={`Switch to ${
            theme === "dark" ? "light" : "dark"
          } theme`}
        >
          <span aria-hidden="true">
            {theme === "dark" ? "☀" : "☾"}
          </span>
        </button>

        <div className="buildora-menu-container" ref={menuRef}>
          <button
            ref={menuButtonRef}
            type="button"
            className="buildora-menu-button"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            onClick={() => setMenuOpen((previous) => !previous)}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              {menuOpen ? (
                <>
                  <path d="M6 6L18 18" />
                  <path d="M18 6L6 18" />
                </>
              ) : (
                <>
                  <path d="M4 6H20" />
                  <path d="M4 12H20" />
                  <path d="M4 18H20" />
                </>
              )}
            </svg>
          </button>

          <nav
            id={menuId}
            className="buildora-menu"
            aria-label="Main navigation"
            hidden={!menuOpen}
          >
            {session && (
              <p className="buildora-menu-greeting">
                Hi, {session.user.first_name || session.user.username}
              </p>
            )}

            <button type="button" onClick={() => visit("#home")}>
              Home
            </button>

            <button
              type="button"
              onClick={() => visit("#learning-paths")}
            >
              Learning paths
            </button>

            <button
              type="button"
              onClick={() => visit("#how-it-works")}
            >
              How it works
            </button>

            {session ? (
              <>
                <button
                  type="button"
                  onClick={() => visit("#dashboard")}
                >
                  My dashboard
                </button>

                <button
                  type="button"
                  onClick={() => visit("#profile")}
                >
                  My profile
                </button>

                <div className="buildora-menu-bottom">
                  <button
                    type="button"
                    className="buildora-logout"
                    onClick={() => {
                      setMenuOpen(false);
                      onLogout();
                    }}
                  >
                    Log out
                  </button>
                </div>
              </>
            ) : (
              <div className="buildora-menu-bottom">
                <button
                  type="button"
                  onClick={() => visit("#login")}
                >
                  Log in
                </button>

                <button
                  type="button"
                  className="buildora-menu-signup"
                  onClick={() => visit("#register")}
                >
                  Create account
                </button>
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}