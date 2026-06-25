import { useState } from "react";
import { useAuth } from "../store/AuthContext.jsx";
import { LogIn, Lock } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      await login(username.trim(), password);
    } catch {
      setError("Invalid username or password.");
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="inline-block w-7 h-7 rounded-full border-2 border-amber-400" />
          <span className="text-lg font-semibold text-ink">Enteral Support Tool</span>
        </div>

        <form onSubmit={submit} className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-sm space-y-4">
          <div>
            <h1 className="text-lg font-semibold text-ink">Sign in</h1>
            <p className="text-sm text-neutral-500">Clinician access to the advisory tool.</p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-neutral-500">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              autoComplete="username"
              className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-neutral-500">Password</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-2.5 text-neutral-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
            </div>
          </div>

          {error && <p className="text-sm text-band-hypo">{error}</p>}

          <button
            type="submit"
            disabled={busy || !username.trim() || !password}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-40"
          >
            <LogIn size={16} /> {busy ? "Signing in…" : "Sign in"}
          </button>

          <div className="border-t border-neutral-100 pt-3">
            <p className="text-xs text-neutral-400 mb-2">Demo accounts (tap to fill):</p>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                ["nurse", "nurse123", "Nurse"],
                ["doctor", "doctor123", "Doctor"],
                ["dit", "dit123", "DIT"],
                ["admin", "admin123", "Admin"],
              ].map(([u, p, label]) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => { setUsername(u); setPassword(p); }}
                  className="text-xs px-2 py-1.5 rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </form>

        <p className="text-center text-xs text-neutral-400 mt-4">
          Research prototype — not for clinical use.
        </p>
      </div>
    </div>
  );
}
