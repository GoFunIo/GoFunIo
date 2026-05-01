import { Footer } from '@/modules/layout/shared/Footer';
import { Header } from '@/modules/layout/shared/Header';
import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/(auth)')({
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
