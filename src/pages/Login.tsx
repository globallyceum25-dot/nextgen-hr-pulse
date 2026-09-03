import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { friendlyError } from "@/lib/errorMessage";

/**
 * Split-panel sign-in: form on the left, photography with floating status
 * cards on the right. The right panel is decorative and is dropped below the
 * lg breakpoint so small screens get the form full-width.
 *
 * Colours come from the app's semantic tokens (primary / card / muted / border)
 * rather than literal values, so this page tracks the same light and dark
 * themes as the authenticated screens without any dark: variants.
 *
 * There is no self-registration in this product — accounts are provisioned by
 * an admin through the create-user function — so this is a sign-in form only.
 */
export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      toast({
        title: "Login failed",
        description: friendlyError(error),
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const fieldClass =
    "w-full rounded-full border border-input bg-background px-5 py-3 text-sm text-foreground " +
    "placeholder:text-muted-foreground shadow-sm outline-none transition-snappy " +
    "focus:border-primary focus:ring-2 focus:ring-primary/20";

  const labelClass = "mb-1.5 block text-[11px] font-medium tracking-wide text-muted-foreground";

  return (
    <div
      className="relative flex min-h-screen items-center justify-center p-4 sm:p-8"
      style={{ background: "var(--gradient-page)" }}
    >
      <div className="pointer-events-none absolute inset-0 gradient-glow" />

      <div
        className="relative z-10 grid w-full max-w-6xl overflow-hidden rounded-[28px] border
                   border-border bg-card shadow-2xl shadow-primary/10 lg:grid-cols-2"
      >
        {/* ---------- form ---------- */}
        <div className="gradient-accent relative flex flex-col justify-between p-8 sm:p-12">
          <span
            className="inline-flex w-fit items-center rounded-full border border-border bg-card/60
                       px-4 py-2 text-sm font-medium text-foreground"
          >
            Nextgen HCS
          </span>

          <div className="mx-auto w-full max-w-sm py-12">
            <h1 className="text-center text-3xl font-semibold tracking-tight text-foreground">
              Welcome back
            </h1>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Sign in to the HR Task &amp; KPI system
            </p>

            <form onSubmit={handleLogin} className="mt-9 space-y-4">
              <div>
                <label htmlFor="email" className={labelClass}>
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className={fieldClass}
                  placeholder="you@lyceumglobal.co"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className={labelClass}>
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    className={`${fieldClass} pr-12`}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground
                               transition-snappy hover:text-foreground"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="gradient-primary gradient-primary-hover mt-2 flex w-full items-center
                           justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-semibold
                           text-primary-foreground shadow-md shadow-primary/20 transition-snappy
                           focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
                           focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-muted-foreground sm:text-left">
            Trouble signing in? Contact your system administrator.
          </p>
        </div>

        {/* ---------- imagery (decorative) ---------- */}
        <div className="relative hidden p-3 lg:block">
          <div className="relative h-full w-full overflow-hidden rounded-[22px]">
            <img
              src="/images/login-team.webp"
              alt=""
              aria-hidden="true"
              width={1536}
              height={2048}
              className="h-full w-full object-cover"
            />

            {/* floating card: upcoming review */}
            <div className="gradient-primary absolute left-6 top-6 rounded-2xl px-4 py-3 shadow-lg shadow-primary/25">
              <p className="text-sm font-semibold text-primary-foreground">Task Review With Team</p>
              <p className="text-xs text-primary-foreground/80">09:30am – 10:00am</p>
            </div>

            {/* floating card: week strip. Sits clear of the meeting card below it;
                the dark scrim keeps the day labels legible over a busy photo. */}
            <div
              className="absolute bottom-44 left-6 right-6 rounded-2xl bg-neutral-900/35 px-4 py-3
                         shadow-lg shadow-black/20 ring-1 ring-white/25 backdrop-blur-md"
            >
              <div className="flex justify-between text-center">
                {[
                  ["Mon", "22"],
                  ["Tue", "23"],
                  ["Wed", "24"],
                  ["Thu", "25"],
                  ["Fri", "26"],
                ].map(([day, date]) => (
                  <div key={day} className="flex-1">
                    <p className="text-[10px] font-medium text-white/75">{day}</p>
                    <p className="text-sm font-semibold text-white">{date}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* floating card: daily meeting */}
            <div className="absolute bottom-6 left-6 rounded-2xl bg-card px-4 py-3 shadow-lg shadow-black/15">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary" />
                <p className="text-sm font-semibold text-foreground">Daily Meeting</p>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">12:00pm – 01:00pm</p>
              <div className="mt-2 flex -space-x-2">
                {["AR", "SM", "KP"].map((initials) => (
                  <span
                    key={initials}
                    className="gradient-primary flex h-6 w-6 items-center justify-center rounded-full
                               border-2 border-card text-[9px] font-semibold text-primary-foreground"
                  >
                    {initials}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
