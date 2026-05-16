//ADDING HEADER AN DFOOTER FOR EVERY PAGE
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

function MainLayout({ children }) {
  return (
    <div className="bg-black text-white min-h-screen flex flex-col">

      {/* Header */}
      <Navbar />

      {/* Page Content */}
      <main className="flex-grow pt-28">
        {children}
      </main>

      {/* Footer */}
      <Footer />

    </div>
  );
}

export default MainLayout;