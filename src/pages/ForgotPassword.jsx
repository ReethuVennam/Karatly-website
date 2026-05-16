import { motion } from "framer-motion";
import { Link } from "react-router-dom";

export default function ForgotPassword() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6 relative overflow-hidden">

      {/* gold glow */}
      <div className="absolute w-[900px] h-[900px] bg-yellow-500 opacity-10 blur-[220px] rounded-full pointer-events-none"></div>

      {/* forgot card */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 bg-gradient-to-b from-[#141414] to-[#0b0b0b] border border-gray-800 rounded-3xl p-14 w-full max-w-lg shadow-xl"
      >

        <h2 className="text-4xl font-bold text-white mb-2">
          Forgot Password
        </h2>

        <p className="text-gray-400 mb-10 text-lg">
          Enter your email to reset your password
        </p>

        <form className="space-y-6">

          <input
            type="email"
            placeholder="Email address"
            className="w-full p-4 bg-black border border-gray-700 rounded-xl text-white focus:border-yellow-400 outline-none text-lg"
          />

          <button className="w-full bg-yellow-400 text-black font-semibold py-4 rounded-xl hover:bg-yellow-300 transition text-lg">
            Send Reset Link
          </button>

        </form>

        <p className="text-gray-400 text-md mt-8 text-center">
          <Link
            to="/login"
            className="text-yellow-400 hover:text-yellow-300 font-medium"
          >
            Back to Login
          </Link>
        </p>

      </motion.div>

    </div>
  );
}