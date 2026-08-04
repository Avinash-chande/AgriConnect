import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sprout, Send, ShieldCheck } from 'lucide-react';
import { Button } from './Button';

export const Footer: React.FC = () => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail('');
    }
  };

  return (
    <footer className="bg-agri-deep text-white pt-16 pb-12 border-t border-emerald-900/40 relative overflow-hidden">
      {/* Background Glow Circles */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-agri-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-emerald-800/60">
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-4 text-left">
            <Link to="/" className="inline-flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-xl bg-agri-primary flex items-center justify-center text-white shadow-agri-glow">
                <Sprout className="w-6 h-6" />
              </div>
              <span className="text-2xl font-extrabold font-heading text-white tracking-tight">
                AgriConnect
              </span>
            </Link>
            <p className="text-slate-300 text-sm leading-relaxed max-w-sm">
              The premier AI-powered agricultural employment platform matching commercial farmers with certified agricultural workers, drone operators, and seasonal crews.
            </p>
            
            <div className="flex items-center space-x-3 text-xs text-emerald-300 pt-2 font-medium">
              <ShieldCheck className="w-4 h-4 text-agri-primary" />
              <span>Verified Profiles • Bank-grade Security • 24/7 Support</span>
            </div>
          </div>

          {/* For Farmers */}
          <div className="space-y-3.5 text-left">
            <h4 className="text-sm font-bold font-heading uppercase tracking-wider text-emerald-400">
              For Farmers
            </h4>
            <ul className="space-y-2 text-sm text-slate-300">
              <li><Link to="/register-farmer" className="hover:text-white transition-colors">Post Farm Job</Link></li>
              <li><a href="#ai-engine" className="hover:text-white transition-colors">AgriMatch AI Engine</a></li>
              <li><a href="#top-workers" className="hover:text-white transition-colors">Browse Worker Talent</a></li>
              <li><Link to="/login" className="hover:text-white transition-colors">Farmer Dashboard</Link></li>
              <li><a href="#categories" className="hover:text-white transition-colors">Emergency Harvesting</a></li>
            </ul>
          </div>

          {/* For Workers */}
          <div className="space-y-3.5 text-left">
            <h4 className="text-sm font-bold font-heading uppercase tracking-wider text-emerald-400">
              For Farm Workers
            </h4>
            <ul className="space-y-2 text-sm text-slate-300">
              <li><Link to="/register-worker" className="hover:text-white transition-colors">Create Worker Profile</Link></li>
              <li><a href="#categories" className="hover:text-white transition-colors">Explore Categories</a></li>
              <li><Link to="/register-worker" className="hover:text-white transition-colors">Daily Payout Setup</Link></li>
              <li><Link to="/login" className="hover:text-white transition-colors">Worker Portal</Link></li>
              <li><a href="#features" className="hover:text-white transition-colors">Skill Certification</a></li>
            </ul>
          </div>

          {/* Newsletter Column */}
          <div className="space-y-3.5 text-left">
            <h4 className="text-sm font-bold font-heading uppercase tracking-wider text-emerald-400">
              Stay Updated
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Get the latest crop season market rates, harvesting updates, and platform features directly in your inbox.
            </p>

            {subscribed ? (
              <div className="bg-emerald-900/60 border border-emerald-500/40 rounded-xl p-3 text-xs text-emerald-200 font-medium">
                ✓ Thank you for subscribing to AgriConnect Updates!
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="space-y-2">
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full bg-slate-900/80 border border-emerald-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-agri-primary"
                  />
                </div>
                <Button variant="primary" size="sm" fullWidth rightIcon={<Send className="w-3.5 h-3.5" />}>
                  Subscribe
                </Button>
              </form>
            )}
          </div>
        </div>

        {/* Bottom Credits & Social */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} AgriConnect Platform Inc. Built for global agriculture.</p>

          <div className="flex items-center space-x-6">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">Security</a>
          </div>

          <div className="flex items-center space-x-3 text-slate-300">
            {/* Twitter / X SVG */}
            <a href="#" className="hover:text-agri-primary transition-colors p-2 rounded-lg bg-slate-900/80 border border-emerald-900/60">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
            {/* LinkedIn SVG */}
            <a href="#" className="hover:text-agri-primary transition-colors p-2 rounded-lg bg-slate-900/80 border border-emerald-900/60">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/></svg>
            </a>
            {/* GitHub SVG */}
            <a href="#" className="hover:text-agri-primary transition-colors p-2 rounded-lg bg-slate-900/80 border border-emerald-900/60">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
