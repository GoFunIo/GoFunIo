import { Footer } from '@/modules/landing/shared/Footer';
import { Header } from '@/modules/landing/shared/Header';
import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/(public)')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex flex-col h-full">
      <Header />

      <main className="flex-1">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}
