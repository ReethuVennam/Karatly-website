import Navbar from "../components/Navbar";
import HowItWorks from "../components/HowItWorks";

export default function HowItWorksPage() {
  return (
    <div className="bg-black text-white min-h-screen">
      <Navbar />

      <div className="pt-28 px-6">
        <HowItWorks />
      </div>
    </div>
  );
}