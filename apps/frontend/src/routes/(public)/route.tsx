import { Footer } from '@/features/homepage/layout/Footer';
import { Header } from '@/features/homepage/layout/Header';
import { BackToTop } from '@/features/homepage/ui/BackToTop';
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
