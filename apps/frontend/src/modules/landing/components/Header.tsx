import { Link } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { useUser } from '@/hooks/useUser';
import { MobileMenu } from './MobileMenu';
import LogoLight from '@/assets/logo/logo_autokeep.svg';
import LogoDark from '@/assets/logo/logo_autokeep_darktheme.svg';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/hooks/useTheme';

const navLinks = [
  { label: 'FUNKCJE', href: '#funkcje' },
  { label: 'JAK DZIAŁA', href: '#proces' },
  { label: 'CENNIK', href: '#cennik' },
  { label: 'FAQ', href: '#faq' },
  { label: 'KONTAKT', href: '#kontakt' },
];

export const Header = () => {
  const { data: user, isLoading } = useUser();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 border-b flex items-center bg-white  dark:bg-bg-card ${
          isScrolled || isMenuOpen
            ? 'bg-white/90 dark:bg-bg-card/90 backdrop-blur-md h-15 lg:h-16 border-primary'
            : 'h-16 lg:h-20 border-transparent'
        }`}
      >
        <div className="container mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-16 flex items-center justify-between">
          {/* GRUPA LEWA: Logo + Linki */}
          <div className="flex items-center gap-8">
            <Link to="/" onClick={() => setIsMenuOpen(false)} className="z-[110] ">
              <img
                src={LogoLight}
                alt="Logo Auto Keep"
                className={`w-auto transition-all duration-500 block dark:absolute dark:opacity-0 dark:pointer-events-none ${
                  isScrolled ? 'h-7 lg:h-8' : 'h-8 lg:h-9'
                }`}
              />

              <img
                src={LogoDark}
                alt="Logo Auto Keep"
                className={`w-auto transition-all duration-500 opacity-0 absolute pointer-events-none dark:relative dark:opacity-100 dark:pointer-events-auto ${
                  isScrolled ? 'h-7 lg:h-8' : 'h-8 lg:h-9'
                }`}
              />
            </Link>

            <nav className="hidden lg:flex items-center gap-6 text-content-primary">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-[13px] font-semibold hover:text-secondary transition-colors uppercase"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          {/* GRUPA PRAWA: Język, Theme, Auth */}
          <div className="flex items-center gap-4">
            <ThemeToggle />

            {/* LOGIN/REGISTER BUTTON  */}
            <div className="hidden lg:flex items-center gap-3">
              {!user && !isLoading && (
                <>
                  <Link to="/login">
                    <Button
                      variant="default"
                      className={`
            text-[11px]! uppercase transition-all duration-500
            ${
              isScrolled
                ? 'px-3! min-w-[80px]! min-h-[34px]!'
                : 'px-4! min-w-[100px]! min-h-[40px]!'
            }
          `}
                    >
                      Login
                    </Button>
                  </Link>

                  <Link to="/signup">
                    <Button
                      variant="outline"
                      className={`
            text-[11px]! uppercase transition-all duration-500
            ${
              isScrolled
                ? 'px-3! min-w-[80px]! min-h-[34px]!'
                : 'px-4! min-w-[100px]! min-h-[40px]!'
            }
          `}
                    >
                      Rejestracja
                    </Button>
                  </Link>
                </>
              )}
            </div>

            {/* HAMBURGER MENU */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="group lg:hidden flex items-center justify-center w-8 h-8 border border-content-secondary rounded-[3px] text-content-secondary hover:border-content-secondary hover:text-content-secondary hover:bg-bg-section"
            >
              {isMenuOpen ? <X size={16} strokeWidth={2} /> : <Menu size={16} strokeWidth={2} />}
            </button>
          </div>
        </div>
      </header>

      {/* WYDZIELONE MENU MOBILNE */}
      <MobileMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        user={user}
        navLinks={navLinks}
      />
    </>
  );
};
