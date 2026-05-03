import './../assets/global.css';

import { Outlet, createRootRoute } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { Footer } from '@/modules/landing/components/Footer';
import { Header } from '@/modules/landing/components/Header';
import { BackToTop } from '@/modules/landing/ui/BackToTop';

const RootLayout = () => (
  <>
    <Header />
    <main>
      <Outlet />
    </main>
    <Footer />
    <BackToTop />
    <TanStackRouterDevtools />
  </>
);

export const Route = createRootRoute({ component: RootLayout });
