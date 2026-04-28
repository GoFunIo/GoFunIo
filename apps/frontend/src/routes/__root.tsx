import './../assets/global.css';

import { Outlet, createRootRoute } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { Footer } from 'src/components/layout/Footer';
import { Header } from 'src/components/layout/Header';

const RootLayout = () => (
  <>
    <Header />

    <main className="min-h-50">
      <Outlet />
    </main>

    <Footer />
    <TanStackRouterDevtools />
  </>
);

export const Route = createRootRoute({ component: RootLayout });
