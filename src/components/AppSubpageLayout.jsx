import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Navbar from "./Navbar";

export function AppPageBack({ title, onBack }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={onBack || (() => navigate(-1))}
      className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-yellow-400 transition hover:text-yellow-300"
    >
      <ArrowLeft className="h-4 w-4" />
      {title}
    </button>
  );
}

export default function AppSubpageLayout({ children, className = "" }) {
  return (
    <div className="karatly-shell min-h-screen text-white">
      <Navbar />
      <main className={`mx-auto max-w-6xl px-5 pb-16 pt-28 sm:px-8 ${className}`}>{children}</main>
    </div>
  );
}
