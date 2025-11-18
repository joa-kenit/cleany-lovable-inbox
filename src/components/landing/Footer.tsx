import { Mail } from "lucide-react";

export function LandingFooter() {
  return (
    <footer className="bg-gray-900 text-gray-300 px-6 py-12 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Mail className="w-6 h-6 text-rose-500" />
              <span className="text-xl font-bold text-white">Cleany</span>
            </div>
            <p className="text-sm text-gray-400 max-w-md">
              Transform your inbox with intelligent email management. Group, delete, and understand your email habits better.
            </p>
          </div>
          
          <div>
            <h3 className="text-white font-semibold mb-3">Product</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-rose-500 transition-colors">Features</a></li>
              <li><a href="#" className="hover:text-rose-500 transition-colors">How it Works</a></li>
              <li><a href="#" className="hover:text-rose-500 transition-colors">Pricing</a></li>
              <li><a href="#" className="hover:text-rose-500 transition-colors">FAQ</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-white font-semibold mb-3">Company</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-rose-500 transition-colors">About</a></li>
              <li><a href="#" className="hover:text-rose-500 transition-colors">Privacy</a></li>
              <li><a href="#" className="hover:text-rose-500 transition-colors">Terms</a></li>
              <li><a href="#" className="hover:text-rose-500 transition-colors">Contact</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-500">
          <p>&copy; 2024 Cleany. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
