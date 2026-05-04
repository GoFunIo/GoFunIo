import { IconWrapper } from '@/features/dashboard/layout/IconWrapper';
import { BoardButton } from '@/features/dashboard/ui/BoardButton';
import { carsArr } from '@/store/cars';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, CarFront } from 'lucide-react';

export const Route = createFileRoute('/dashboard/my-cars/$carId')({
  loader: ({ params }) => {
    return carsArr.find((b) => String(b.id) === params.carId);
  },
  component: RouteComponent,
});

function RouteComponent() {
  const car = Route.useLoaderData();

  if (!car) return <h1 className="">Car not found</h1>;

  return (
    <div className="">
      <Link
        to="/dashboard/my-cars"
        className="w-fit px-[4px] py-[6px] flex items-center gap-[8px] text-[12px] text-content-secondary"
      >
        <ArrowLeft size={18} />
        Wróć do pojazdów
      </Link>
      <div className="md:my-[24px] my-[12px] grid sm:grid-cols-2 grid-cols-1 gap-[16px]">
        <div className="flex gap-[16px] items-center shrink-0">
          <IconWrapper className="xl:w-[60px] xl:h-[60px] w-[50px] h-[50px]  bg-secondary">
            <CarFront className="text-white" />
          </IconWrapper>
          <div className="">
            <h3 className="pb-[3px]">{car.title}</h3>
            <p className="text-[14px] text-dark">
              {car.year} - {car.registration} - {car.fuel}
            </p>
          </div>
        </div>
        <div className="sm:ml-auto order-1 flex gap-[16px]">
          <BoardButton onClick={() => {}} icon="edit" size="small">
            Edytuj
          </BoardButton>
          <BoardButton onClick={() => {}} icon="delete" variant="danger" size="small">
            Usuń
          </BoardButton>
        </div>
      </div>
    </div>
  );
}
