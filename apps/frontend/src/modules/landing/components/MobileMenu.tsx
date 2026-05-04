import { Link } from '@tanstack/react-router';
import { useUser } from '@/hooks/useUser';
import { Button } from '@/components/ui/Button';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';

type UserType = ReturnType<typeof useUser>['data'];

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserType;
  navLinks: { label: string; href: string }[];
}

export const MobileMenu = ({ isOpen, onClose, user, navLinks }: MobileMenuProps) => {
  useLockBodyScroll(isOpen);

  return (
    <div
      className={`fixed inset-0 z-[90] bg-bg-card transition-transform duration-500 lg:hidden ${
        isOpen ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <div className="flex flex-col  justify-start h-full gap-8 px-6 pt-21">
        <nav className="flex flex-col w-full max-w-[768px] gap-0 text-content-primary mb-4">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={onClose}
              className=" w-full px-4 py-2 text-[20px] font-bold text-content-primary rounded-[3px] transition-all duration-200 hover:bg-bg-section  hover:text-secondary  flex items-center"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex flex-col w-full md:max-w-[450px] gap-4 items-start justify-start">
          {!user ? (
            <>
              <Link to="/login" onClick={onClose} className="w-full">
                <Button variant="default" className="w-full uppercase tracking-widest ">
                  Login
                </Button>
              </Link>

              <Link to="/signup" onClick={onClose} className="w-full">
                <Button variant="outline" className="w-full uppercase tracking-widest ">
                  Rejestracja
                </Button>
              </Link>
            </>
          ) : (
            <Link to="/dashboard" onClick={onClose} className="w-full">
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
