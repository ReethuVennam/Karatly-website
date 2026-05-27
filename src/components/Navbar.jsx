import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Bell, Menu, X } from "lucide-react";
import {
  clearAuthSession,
  getUserProfile,
  isAuthenticated
} from "../api/authApi";

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const navigate = useNavigate();
  const loggedIn = isAuthenticated();
  const userProfile = getUserProfile();
  const displayName = userProfile?.fullName || "User";
  const displayEmail = userProfile?.email || "No email available";
  const userInitial = displayName.charAt(0).toUpperCase() || "U";

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const closeDropdown = () => setProfileOpen(false);
    document.addEventListener("click", closeDropdown);
    return () => document.removeEventListener("click", closeDropdown);
  }, []);

  const handleLogout = () => {
    clearAuthSession();
    navigate("/");
    window.location.reload();
  };

  const navItems = loggedIn
    ? [
        ["Home", "/"],
        ["Dashboard", "/dashboard"],
        ["Why Karatly", "/why"],
        ["How It Works", "/how-it-works"],
        ["History", "/portfolio?tab=history"],
        ["Market", "/products"],
        ["Order", "/orders"]
      ]
    : [
        ["Home", "/"],
        ["Why Karatly", "/why"],
        ["How It Works", "/how-it-works"],
        ["Market", "/products"],
        ["Login", "/login"]
      ];

  return (
    <nav className={`fixed top-0 z-50 w-full transition ${isScrolled ? "bg-black/90 backdrop-blur" : "bg-transparent"}`}>
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex h-20 items-center justify-between">
          <Link to={loggedIn ? "/dashboard" : "/"} className="flex items-center gap-2">
            <img
              src="/images/karataly-logo.png"
              alt="Karataly"
              className="h-9 w-9 rounded-md object-cover"
            />
            <div className="leading-none">
              <p className="text-sm font-semibold text-white">Karatly</p>
              <p className="text-[10px] uppercase tracking-[0.12em] text-white/60">Premium Gold</p>
            </div>
          </Link>

          <div className="hidden items-center gap-6 xl:gap-8 lg:flex">
            {navItems.map(([label, path]) => (
              <Link
                key={path}
                to={path}
                className="whitespace-nowrap border-b-2 border-transparent pb-1 text-sm text-white transition hover:border-yellow-400 hover:text-yellow-300"
              >
                {label}
              </Link>
            ))}
            {!loggedIn ? (
              <Link to="/signup" className="rounded-full bg-yellow-400 px-5 py-2 text-sm font-semibold text-black">
                Start
              </Link>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/notifications"
                  className="relative grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-white/5 text-yellow-400 transition hover:border-yellow-400/40 hover:bg-white/10"
                  aria-label="Notifications"
                >
                  <Bell className="h-5 w-5" />
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
                </Link>
                <div className="relative">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setProfileOpen(!profileOpen);
                  }}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f5a400] text-base font-bold text-black"
                >
                  {userInitial}
                </button>

                {profileOpen ? (
                  <div className="absolute right-0 mt-3 w-60 overflow-hidden rounded-xl border border-white/10 bg-[#101514] shadow-2xl">
                    <div className="border-b border-white/10 px-4 py-3">
                      <p className="font-semibold text-white">{displayName}</p>
                      <p className="mt-1 truncate text-xs text-white/45">{displayEmail}</p>
                    </div>
                    {[
                      ["My Profile", "/profile"],
                      ["My Orders", "/orders"],
                      ["Settings", "/settings"],
                      ["Help & Support", "/help"]
                    ].map(([label, path]) => (
                      <button
                        key={path}
                        type="button"
                        onClick={() => {
                          navigate(path);
                          setProfileOpen(false);
                        }}
                        className="block w-full px-4 py-3 text-left text-sm text-white/75 hover:bg-white/5 hover:text-white"
                      >
                        {label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="block w-full border-t border-white/10 px-4 py-3 text-left text-sm text-red-400 hover:bg-white/5"
                    >
                      Sign Out
                    </button>
                  </div>
                ) : null}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            className="lg:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle navigation"
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {menuOpen ? (
          <div className="mb-4 rounded-xl border border-white/10 bg-black/95 p-4 lg:hidden">
            <div className="flex flex-col gap-3">
              {navItems.map(([label, path]) => (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg px-3 py-2 text-white/80 hover:bg-white/5"
                >
                  {label}
                </Link>
              ))}
              {loggedIn ? (
                <>
                  <Link to="/notifications" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2 text-white/80 hover:bg-white/5">
                    Notifications
                  </Link>
                  <Link to="/profile" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2 text-white/80 hover:bg-white/5">
                    Profile
                  </Link>
                  <button onClick={handleLogout} className="rounded-lg px-3 py-2 text-left text-red-400 hover:bg-white/5">
                    Sign Out
                  </button>
                </>
              ) : (
                <Link to="/signup" onClick={() => setMenuOpen(false)} className="rounded-lg bg-yellow-400 px-3 py-2 text-center font-semibold text-black">
                  Start
                </Link>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </nav>
  );
}

export default Navbar;
