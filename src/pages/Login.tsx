import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2 } from "lucide-react";

/**
 * Split-panel sign-in: form on the left, photography with floating status
 * cards on the right. The right panel is decorative and is dropped below the
 * lg breakpoint so small screens get the form full-width.
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
        description: error.message,
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const fieldClass =
    "w-full rounded-full border border-black/5 bg-white/70 px-5 py-3 text-sm text-neutral-800 " +
    "placeholder:text-neutral-400 shadow-sm outline-none transition " +
    "focus:border-amber-300 focus:bg-white focus:ring-2 focus:ring-amber-200/70 " +
    "dark:border-white/10 dark:bg-white/5 dark:text-neutral-100 dark:placeholder:text-neutral-500 " +
    "dark:focus:border-amber-400/40 dark:focus:bg-white/10 dark:focus:ring-amber-400/20";

  const labelClass =
    "mb-1.5 block text-[11px] font-medium tracking-wide text-neutral-500 dark:text-neutral-400";

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-200/70 p-4 dark:bg-neutral-950 sm:p-8">
      <div
        className="grid w-full max-w-6xl overflow-hidden rounded-[28px] bg-white shadow-2xl
                   shadow-black/10 ring-1 ring-black/5 lg:grid-cols-2
                   dark:bg-neutral-900 dark:shadow-black/40 dark:ring-white/10"
      >
        {/* ---------- form ---------- */}
        <div
          className="relative flex flex-col justify-between bg-gradient-to-b from-neutral-50 via-amber-50/40
                     to-amber-100/60 p-8 sm:p-12 dark:from-neutral-900 dark:via-neutral-900 dark:to-amber-950/20"
        >
          <span
            className="inline-flex w-fit items-center rounded-full border border-black/10 px-4 py-2
                       text-sm font-medium text-neutral-700 dark:border-white/15 dark:text-neutral-200"
          >
            Nextgen HCS
          </span>

          <div className="mx-auto w-full max-w-sm py-12">
            <h1 className="text-center text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
              Welcome back
            </h1>
            <p className="mt-2 text-center text-sm text-neutral-500 dark:text-neutral-400">
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
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400
                               transition-colors hover:text-neutral-600 dark:hover:text-neutral-200"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-amber-300
                           px-5 py-3.5 text-sm font-semibold text-neutral-900 shadow-sm transition
                           hover:bg-amber-400 focus-visible:outline focus-visible:outline-2
                           focus-visible:outline-offset-2 focus-visible:outline-amber-500
                           disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-neutral-500 dark:text-neutral-400 sm:text-left">
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
            <div
              className="absolute left-6 top-6 rounded-2xl bg-amber-300/95 px-4 py-3 shadow-lg
                         shadow-black/10 backdrop-blur"
            >
              <p className="text-sm font-semibold text-neutral-900">Task Review With Team</p>
              <p className="text-xs text-neutral-700">09:30am – 10:00am</p>
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
            <div className="absolute bottom-6 left-6 rounded-2xl bg-white/95 px-4 py-3 shadow-lg shadow-black/10">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                <p className="text-sm font-semibold text-neutral-900">Daily Meeting</p>
              </div>
              <p className="mt-0.5 text-xs text-neutral-500">12:00pm – 01:00pm</p>
              <div className="mt-2 flex -space-x-2">
                {["AR", "SM", "KP"].map((initials) => (
                  <span
                    key={initials}
                    className="flex h-6 w-6 items-center justify-center rounded-full border-2
                               border-white bg-neutral-700 text-[9px] font-semibold text-white"
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
