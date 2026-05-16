import Navbar from "../components/Navbar";
import Features from "../components/Features";

export default function FeaturesPage() {
  return (
    <div className="bg-black text-white min-h-screen">
      <Navbar />

      {/* spacing below navbar */}
      <div className="pt-28 px-6">
        <Features />
      </div>
    </div>
  );
}