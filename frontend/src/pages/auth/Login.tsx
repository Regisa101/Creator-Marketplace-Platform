import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { AuthLayout } from "./AuthLayout";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function Login() {
  const navigate = useNavigate();
  const { loginUser } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError("Email is required.");
      return;
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!password) {
      setError("Password is required.");
      return;
    }

    setLoading(true);

    try {
      // Do not send a role. The backend identifies the account by email
      // and returns the role stored for that account in the database.
      await loginUser({
        email: trimmedEmail,
        password,
      });

      // Both roles use /dashboard. Dashboard reads user.role and renders
      // the correct creator or brand dashboard.
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          "Login failed. Please check your email and password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout mode="login" title="Log in to CreatorHub">
      <form onSubmit={handleSubmit} noValidate>
        <div className="az-field">
          <label className="az-label" htmlFor="login-email">
            Email
          </label>
          <input
            id="login-email"
            className="az-input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            disabled={loading}
          />
        </div>

        <div className="az-field">
          <label className="az-label" htmlFor="login-password">
            Password
          </label>

          <div className="az-pw-wrap">
            <input
              id="login-password"
              className="az-input"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              disabled={loading}
            />

            <button
              type="button"
              className="az-pw-toggle"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              disabled={loading}
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {error && (
          <div className="az-error" role="alert">
            {error}
          </div>
        )}

        <button type="submit" className="az-submit" disabled={loading}>
          {loading ? "Logging in…" : "Log in"}
          {!loading && <ArrowRight size={15} />}
        </button>
      </form>
    </AuthLayout>
  );
}

export default Login;
