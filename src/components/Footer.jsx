import React from "react";
import { Mail, Phone, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
function Footer() {
  return (
    <footer className="bg-black text-white border-t border-white/10 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-5 gap-10">

        {/* Brand Section */}
        <div className="col-span-2">
          <h2 className="text-xl font-bold text-yellow-400 mb-4 cursor-default">
            SabPe Gold
          </h2>

          <p className="text-white/60 mb-6 max-w-sm">
            India's trusted digital gold platform. Buy, sell, and store 24K pure gold securely.
          </p>

          <div className="space-y-3 text-white/70 text-sm">
            <a href="mailto:support@sabpegold.com" className="flex items-center gap-2 hover:text-yellow-400 transition-colors">
              <Mail size={16} />
              support@sabpegold.com
            </a>

            <a href="tel:+911234567890" className="flex items-center gap-2 hover:text-yellow-400 transition-colors">
              <Phone size={16} />
              +91 123 456 7890
            </a>

            <a href="https://goo.gl/maps/your-mumbai-location" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-yellow-400 transition-colors">
              <MapPin size={16} />
              Mumbai, Maharashtra, India
            </a>
          </div>
        </div>

        {/* Product */}
        <div>
          <h3 className="font-semibold mb-4">Product</h3>
          <ul className="space-y-2 text-white/60 text-sm">
            <li><a href="#" className="hover:text-yellow-400 transition-colors">Buy Digital Gold</a></li>
            <li><a href="#" className="hover:text-yellow-400 transition-colors">Sell Digital Gold</a></li>
            <li><a href="#" className="hover:text-yellow-400 transition-colors">Gold SIP</a></li>
            <li><a href="#" className="hover:text-yellow-400 transition-colors">Gold Gifting</a></li>
            <li><a href="#" className="hover:text-yellow-400 transition-colors">Gold Delivery</a></li>
          </ul>
        </div>

        {/* Company */}
        <div>
          <h3 className="font-semibold mb-4">Company</h3>
          <ul className="space-y-2 text-white/60 text-sm">
            <li><a href="#" className="hover:text-yellow-400 transition-colors">About Us</a></li>
            <li><a href="#" className="hover:text-yellow-400 transition-colors">Careers</a></li>
            <li><a href="#" className="hover:text-yellow-400 transition-colors">Blog</a></li>
            <li><a href="#" className="hover:text-yellow-400 transition-colors">Press</a></li>
            <li><a href="#" className="hover:text-yellow-400 transition-colors">Partners</a></li>
          </ul>
        </div>

        {/* Legal */}
        <div>
          <h3 className="font-semibold mb-4">Legal</h3>
          <ul className="space-y-2 text-white/60 text-sm">
          <li>
<Link to="/privacy-policy">Privacy Policy</Link>
</li>

<li>
<Link to="/terms">Terms of Service</Link>
</li>

<li>
<Link to="/refund-policy">Refund Policy</Link>
</li>

<li>
<Link to="/disclaimer">Disclaimer</Link>
</li>
            {/* <li><a href="#" className="hover:text-yellow-400 transition-colors">Privacy Policy</a></li>
            <li><a href="#" className="hover:text-yellow-400 transition-colors">Terms of Service</a></li>
            <li><a href="#" className="hover:text-yellow-400 transition-colors">Refund Policy</a></li>
            <li><a href="#" className="hover:text-yellow-400 transition-colors">Disclaimer</a></li> */}
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="max-w-7xl mx-auto px-6 mt-12 pt-6 border-t border-white/10 flex flex-col md:flex-row justify-between text-white/40 text-sm">
        <p>© 2026 SabPe Gold. All rights reserved.</p>

        <p className="mt-2 md:mt-0">
          Digital gold investments are subject to market risks. Please read all scheme related documents carefully.
        </p>
      </div>
    </footer>
  );
}

export default Footer;