import { useState } from "react";

const fields = [
  {
    name: "username",
    label: "Username",
    type: "text",
    autoComplete: "username",
    required: true,
    maxLength: 150,
  },
  {
    name: "email",
    label: "Email address",
    type: "email",
    autoComplete: "email",
    required: true,
  },
  {
    name: "first_name",
    label: "First name (optional)",
    type: "text",
    autoComplete: "given-name",
    maxLength: 150,
  },
  {
    name: "last_name",
    label: "Last name (optional)",
    type: "text",
    autoComplete: "family-name",
    maxLength: 150,
  },
  {
    name: "password",
    label: "Password",
    type: "password",
    autoComplete: "new-password",
    required: true,
  },
  {
    name: "password_confirm",
    label: "Confirm password",
    type: "password",
    autoComplete: "new-password",
    required: true,
  },
];

export default function Register({ onLogin, header }) {
  const [form, setForm] = useState({
    username: "",
    email: "",
    first_name: "",
    last_name: "",
    password: "",
    password_confirm: "",
  });

  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(false);

  function updateField(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [name]: "",
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy) return;

    setError("");
    setErrors({});

    if (form.password !== form.password_confirm) {
      setErrors({
        password_confirm: "Your passwords do not match.",
      });
      return;
    }

    setBusy(true);

    try {
      const response = await fetch("/api/accounts/register/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          username: form.username.trim(),
          email: form.email.trim(),
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
        }),
      });

      if (response.ok) {
        setCreated(true);

        setForm((previous) => ({
          ...previous,
          password: "",
          password_confirm: "",
        }));

        return;
      }

      const data = await response.json().catch(() => null);

      if (response.status === 400 && data) {
        const fieldErrors = {};

        for (const field of fields) {
          const messages = data[field.name];

          if (messages) {
            fieldErrors[field.name] = Array.isArray(messages)
              ? messages.join(" ")
              : String(messages);
          }
        }

        setErrors(fieldErrors);

        const generalError = data.detail || data.non_field_errors;

        setError(
          generalError
            ? Array.isArray(generalError)
              ? generalError.join(" ")
              : String(generalError)
            : "Please check the highlighted fields."
        );

        return;
      }

      throw new Error(
        `Registration failed (${response.status}). Please try again.`
      );
    } catch (err) {
      setError(
        err instanceof TypeError
          ? "Unable to reach the server. If you already submitted, try logging in before submitting again."
          : err.message || "Unable to create your account."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="site">
      <fieldset
  disabled={busy}
  aria-label="Page navigation"
  style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
>
  {header}
</fieldset>
      <main className="auth-page">
        {created ? (
          <>
            <p className="eyebrow">YOU’RE READY TO BEGIN</p>
            <h1 className="path-title">Account created.</h1>

            <p role="status">
              Your username is <strong>{form.username.trim()}</strong>.
              You can now log in and choose a learning path.
            </p>

            <button
              type="button"
              className="primary-link"
              onClick={onLogin}
            >
              Continue to login →
            </button>
          </>
        ) : (
          <>
            <p className="eyebrow">START YOUR LEARNING JOURNEY</p>
            <h1 className="path-title">Create your account.</h1>

            <p className="section-description">
              Learn through projects and keep track of your progress.
            </p>

            <form className="auth-form" onSubmit={handleSubmit}>
              {fields.map((field) => (
                <div className="auth-field" key={field.name}>
                  <label htmlFor={`register-${field.name}`}>
                    {field.label}
                  </label>

                  <input
                    id={`register-${field.name}`}
                    name={field.name}
                    type={field.type}
                    autoComplete={field.autoComplete}
                    required={field.required}
                    maxLength={field.maxLength}
                    value={form[field.name]}
                    onChange={updateField}
                    disabled={busy}
                    aria-invalid={Boolean(errors[field.name])}
                    aria-describedby={
                      errors[field.name]
                        ? `error-${field.name}`
                        : undefined
                    }
                  />

                  {errors[field.name] && (
                    <p
                      className="field-error"
                      id={`error-${field.name}`}
                    >
                      {errors[field.name]}
                    </p>
                  )}
                </div>
              ))}

              {error && (
                <div className="error-box" role="alert">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="primary-link"
                disabled={busy}
              >
                {busy ? "Creating account…" : "Create account"}
              </button>
            </form>

            <p className="auth-switch">
              Already have an account?{" "}
              <button
                type="button"
                className="text-button"
                onClick={onLogin}
                disabled={busy}
              >
                Log in
              </button>
            </p>
          </>
        )}
      </main>
    </div>
  );
}