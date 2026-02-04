import { Link } from 'react-router-dom';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-8 md:py-10 bg-slate-900 text-slate-300">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          {/* Logo & Tagline */}
          <div className="mb-6 md:mb-0 text-center md:text-left">
            <img src="/kpege-logo-light.svg" alt="Kpege" className="h-6 md:h-8 mx-auto md:mx-0 mb-3" />
            <p className="max-w-xs text-xs md:text-sm text-slate-400 leading-relaxed">
              Making financial management simple and effortless.
            </p>
          </div>

          {/* Navigation Links */}
          <nav className="flex space-x-6 text-sm mb-6 md:mb-0">
            <Link to="/privacy" className="hover:text-white transition-colors">
              Privacy
            </Link>
            <Link to="/blog" className="hover:text-white transition-colors">
              Blog
            </Link>
          </nav>
        </div>

        <div className="pt-4 mt-6 border-t border-slate-800 text-center">
          <p className="text-xs">© {currentYear} Ingenious Resources International Limited. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 