import { Link } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useUser } from '@/hooks/useUser';
import { Button } from '@/components/ui/Button';

type UserType = ReturnType<typeof useUser>['data'];

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserType;
  navLinks: { label: string; href: string }[];
}

export const MobileMenu = ({ isOpen, onClose, user, navLinks }: MobileMenuProps) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.height = '100vh';
    } else {
      document.body.style.overflow = 'unset';
      document.body.style.height = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
      document.body.style.height = 'unset';
    };
  }, [isOpen]);

  return (
    <div
      className={`fixed inset-0 z-[90] bg-bg-card transition-transform duration-500 lg:hidden ${
        isOpen ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <div className="flex flex-col items-center justify-start h-full gap-8 px-6 pt-40">
        <nav className="flex flex-col items-center gap-6 text-content-primary">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={onClose}
              className="text-2xl font-bold text-content-primary hover:text-secondary transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <hr className="w-full max-w-[200px] border-gray-100" />

        {/* Sekcja Auth w MobileMenu - Wersja z Twoimi Buttonami */}
        <div className="flex flex-col w-full gap-4 max-w-[280px] mt-8">
          {!user ? (
            <>
              <Link to="/login" onClick={onClose} className="w-full">
                <Button variant="default" className="w-full uppercase tracking-widest ">
                  Login
                </Button>
              </Link>

              <Link to="/signup" onClick={onClose} className="w-full">
                <Button variant="outline" className="w-full  uppercase tracking-widest ">
                  Rejestracja
                </Button>
              </Link>
            </>
          ) : (
            <Link to="/userdashboard" onClick={onClose} className="w-full">
              <Button variant="default" className="w-full uppercase ">
                Dashboard
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};
