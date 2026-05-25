import { Toaster } from "react-hot-toast";
import { useEffect } from "react";
import {
  useLocation,
  BrowserRouter as Router,
  Routes,
  Route,
} from "react-router-dom";
import { validateToken, isAuthenticated } from "./api/authApi";
import ProfilePage from "./pages/ProfilePage";
import OrdersPage from "./pages/OrdersPage";
import SettingsPage from "./pages/SettingsPage";
import HelpPage from "./pages/HelpPage";
import KYCPage from "./pages/KYCPage";
import NotificationsPage from "./pages/NotificationsPage";
import BankPage from "./pages/BankPage";
import HomePage from "./pages/HomePage";

// DASHBOARD
import Dashboard from "./pages/Dashboard";
import Portfolio from "./dashboard/Portfolio";
import LearnMore from "./pages/LearnMore";

// MAIN COMPONENTS

// 🔥 IMPORTANT: ADD THESE IMPORTS
import FeaturesPage from "./pages/Featurespage";
import HowItWorksPage from "./pages/HowItWorksPage";
import WhyPage from "./pages/Whypage";
import FAQPage from "./pages/FAQPage";
import MobilePage from "./pages/MobilePage";

// AUTH
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";

// LEGAL
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Terms from "./pages/Terms";
import RefundPolicy from "./pages/RefundPolicy";
import Disclaimer from "./pages/Disclaimer";

// OTHER
import Products from "./pages/Products";
import GoldPlatformPage from "./pages/GoldPlatformPage";

// DEMO
import DemoBadge from "./components/DemoBadge";

function App() {
  // Refresh KYC status, profilePhoto, augmontUniqueId from DB on every app load
  useEffect(() => {
    if (isAuthenticated()) {
      validateToken().catch(() => {});
    }
  }, []);

  return (
    <Router>
      <Toaster position="top-right" />
      <ScrollToSection />

      <Routes>
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/help" element={<HelpPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/bank" element={<BankPage />} />
        <Route path="/gold-platform" element={<GoldPlatformPage />} />
        <Route path="/kyc" element={<KYCPage />} />

        {/* DASHBOARD */}
        <Route path="/dashboard/*" element={<Dashboard />} />

        {/* SEPARATE PAGES */}
        <Route path="/portfolio" element={<Portfolio />} />
        <Route path="/products" element={<Products />} />
        <Route path="/mobile" element={<MobilePage />} />

        {/* NEW PAGES */}
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        <Route path="/why" element={<WhyPage />} />
        <Route path="/faq" element={<FAQPage />} />

        {/* HOME */}
        <Route path="/" element={<HomePage />} />

        {/* AUTH */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* LEGAL */}
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/refund-policy" element={<RefundPolicy />} />
        <Route path="/disclaimer" element={<Disclaimer />} />
        <Route path="/learn-more" element={<LearnMore />} />
      </Routes>

      {/* Demo mode floating badge */}
      <DemoBadge />
    </Router>
  );
}

function ScrollToSection() {
  const location = useLocation();
  useEffect(() => {
    if (location.hash) {
      const el = document.querySelector(location.hash);
      if (el) {
        setTimeout(() => { el.scrollIntoView({ behavior: "smooth" }); }, 100);
      }
    }
  }, [location]);
  return null;
}

export default App;
