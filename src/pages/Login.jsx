import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Fingerprint, KeyRound, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import { sendOtp, setUserProfile, verifyOtp } from "../api/authApi";
import { setAugmontUser } from "../api/augmontApi";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("otp");
  const [error, setError] = useState("");

  const handleSendOtp = async (e) => {
    e.preventDefault();

    if (!email || !mobileNumber) {
      toast.error("Enter email and mobile number");
      return;
    }
    setLoading(true);
    setError("");
    const response = await sendOtp({ email, mobileNumber, type: "login" });
    setLoading(false);
    if (!response?.ok) {
      toast.error(response?.message || "Failed to send OTP");
      return;
    }
    setOtpSent(true);
    toast.success(response?.message || "OTP sent successfully");
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp) {
      toast.error("Enter the OTP");
      return;
    }

    setLoading(true);
    setError("");

    const response = await verifyOtp({ email, mobileNumber, otp, type: "login" });

    if (!response?.ok) {
      setLoading(false);
      if (response?.code === "SESSION_EXISTS") {
        setError(response.message);
      } else {
        toast.error(response?.message || "OTP verification failed");
      }
      return;
    }

    toast.success("Login successful");

    const uniqueId =
      response?.userInfo?.augmontUniqueId ||
      response?.uniqueId ||
      "";
    const dateOfBirth = response?.userInfo?.dateOfBirth || "";
    const cleanMobile = String(mobileNumber).replace(/\D/g, "").slice(-10);

    setLoading(false);
    setStep("done");

    setUserProfile({ email, mobileNumber: cleanMobile, dateOfBirth, uniqueId });
    setAugmontUser({
      uniqueId,
      emailId: response?.userInfo?.email || email,
      mobileNumber: cleanMobile,
      userName: response?.userInfo?.name || ""
    });
    navigate("/dashboard");
  };

  const otpDigits = String(otp || "").split("").slice(0, 4);

  return (
    <div className="karatly-shell min-h-screen text-white">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="fixed left-6 top-7 z-10 inline-flex items-center gap-2 text-sm text-white/75 hover:text-white sm:left-20"
      >
        <ArrowLeft className="h-5 w-5 rounded-full border border-white/60 p-0.5" />
        Back
      </button>

      <main className="mx-auto flex min-h-screen w-full max-w-[520px] flex-col items-center justify-center px-5 py-16 text-center">
        <section className="w-full rounded-2xl border border-yellow-500/20 bg-black/45 p-6 shadow-2xl backdrop-blur sm:p-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#50360b]">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#ffd45a] text-black">
              {otpSent ? <KeyRound className="h-6 w-6" /> : <Fingerprint className="h-7 w-7" />}
            </div>
          </div>

          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-yellow-500/30 bg-black/35 px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] text-white/80">
            <ShieldCheck className="h-3 w-3 text-yellow-300" />
            {otpSent ? "One Time Password" : "Vault Access"}
          </div>

          <p className="text-[10px] uppercase tracking-[0.28em] text-white/45">
            Step {otpSent ? "2" : "1"} of 2
          </p>

          <h1 className="mt-4 text-2xl font-bold leading-tight sm:text-3xl">
            {otpSent ? "Verify your account" : "Welcome back to"}
            <span className="block text-[#e5a71e]">
              {otpSent ? "Karatly" : "Karatly"}
            </span>
          </h1>

          <p className="mx-auto mt-4 max-w-sm text-xs leading-5 text-white/65">
            {otpSent
              ? `Enter the secure code sent to +91 ${String(mobileNumber).replace(/\d(?=\d{2})/g, "*")}`
              : "Sign in with your registered email and mobile number."}
          </p>

          {error ? (
            <div className="mt-5 w-full rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          {step === "creating_user" ? (
            <div className="mt-10 flex flex-col items-center gap-4 text-white/60">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-yellow-400 border-t-transparent" />
              <p className="text-sm">Creating your Augmont account...</p>
            </div>
          ) : (
            <form
              className="mt-7 w-full space-y-4"
              onSubmit={otpSent ? handleVerifyOtp : handleSendOtp}
            >
            {!otpSent ? (
              <>
                <input
                  id="email"
                  type="email"
                  placeholder="Email Address *"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="karatly-input h-12 px-4 text-sm disabled:opacity-60"
                />
                <input
                  id="mobileNumber"
                  type="tel"
                  placeholder="Mobile number *"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  disabled={loading}
                  className="karatly-input h-12 px-4 text-sm disabled:opacity-60"
                />
              </>
            ) : (
              <>
                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  disabled={loading}
                  className="sr-only"
                  autoFocus
                />
                <label htmlFor="otp" className="mx-auto grid max-w-xs cursor-text grid-cols-4 gap-3">
                  {[0, 1, 2, 3].map((index) => (
                    <span
                      key={index}
                      className={`flex h-14 items-center justify-center rounded-xl border bg-[#1c1611] text-xl font-semibold ${
                        index === otpDigits.length
                          ? "border-yellow-400"
                          : "border-yellow-500/25"
                      }`}
                    >
                      {otpDigits[index] || ""}
                    </span>
                  ))}
                </label>
                <p className="text-xs text-white/55">
                  Didn't receive code? <button type="button" onClick={handleSendOtp} className="text-yellow-300">Resend</button>
                </p>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="karatly-gold-button h-12 w-full rounded-xl text-sm font-bold transition hover:brightness-105 disabled:opacity-70"
            >
              {loading ? "Please wait..." : otpSent ? "Verify & Continue  ->" : "Send OTP  ->"}
            </button>

            {!otpSent ? (
              <>
                <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.18em] text-white/45">
                  <span className="h-px flex-1 bg-white/25" />
                  Secure Login
                  <span className="h-px flex-1 bg-white/25" />
                </div>
                <p className="text-xs text-white/50">256-bit encrypted - BIS verified platform</p>
                <p className="pt-3 text-sm text-white/80">
                  New to Karatly?{" "}
                  <Link to="/signup" className="text-yellow-300">
                    create account
                  </Link>
                </p>
              </>
            ) : (
              <button
                type="button"
                onClick={() => { setOtpSent(false); setOtp(""); setError(""); }}
                className="pt-2 text-sm text-white/45 hover:text-white/70"
              >
                Change email or mobile
              </button>
            )}
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
