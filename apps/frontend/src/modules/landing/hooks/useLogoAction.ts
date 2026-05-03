import { useNavigate, useRouterState } from '@tanstack/react-router';

export const useLogoAction = (closeMenu?: () => void) => {
  const navigate = useNavigate();
  const state = useRouterState();

  const handleLogoClick = (e?: React.MouseEvent) => {
    e?.preventDefault();

    if (closeMenu) closeMenu();

    if (state.location.pathname === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate({ to: '/' });
      window.scrollTo({ top: 0 });
    }
  };

  return { handleLogoClick };
};
