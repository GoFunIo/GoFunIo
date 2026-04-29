import './../assets/global.css';

import { Outlet, createRootRoute } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { Footer } from 'src/components/layout/Footer';
import { Header } from 'src/components/layout/Header';

const RootLayout = () => (
  <div className="flex flex-col h-full">
    <Header />

    <main className="flex-1">
      <Outlet />
    </main>

    <Footer />
    <TanStackRouterDevtools />
  </div>
);

export const Route = createRootRoute({ component: RootLayout });
