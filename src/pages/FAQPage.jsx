import Navbar from "../components/Navbar";
import FAQ from "../components/FAQ";

export default function FAQPage() {
  return (
    <div className="bg-black text-white min-h-screen">
      <Navbar />
      <div className="pt-28 px-6">
        <FAQ />
      </div>
    </div>
  );
}