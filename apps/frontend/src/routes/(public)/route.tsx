import { Footer } from '@/modules/landing/components/Footer';
import { Header } from '@/modules/landing/components/Header';
import { BackToTop } from '@/modules/landing/ui/BackToTop';
import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/(public)')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <Header />
      <main>
        <Outlet />
      </main>
      <Footer />
      <BackToTop />
    </>
  );
}
