import { BlockWrapper } from '@/features/dashboard/ui/BlockWrapper';
import { BoardButton } from '@/features/dashboard/ui/BoardButton';
import { GridWrapper } from '@/features/dashboard/ui/GridWrapper';
import { IconWrapper } from '@/features/dashboard/ui/IconWrapper';
import { History } from '@/features/dashboard/widgets/History';
import { activityArr, carsArr } from '@/store/cars';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, CarFront, Gauge } from 'lucide-react';

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
    <>
      <Link
        to="/dashboard/my-cars"
        className="w-fit flex items-center gap-[8px] text-[12px] text-content-secondary"
      >
        <ArrowLeft size={18} />
        Wróć do pojazdów
      </Link>
      <div className="grid sm:grid-cols-2 grid-cols-1 gap-[16px]">
        <div className="flex gap-[16px] items-center shrink-0">
          <IconWrapper className="xl:w-[60px] xl:h-[60px] w-[50px] h-[50px]  bg-secondary">
            <CarFront className="text-white" />
          </IconWrapper>
          <div className="">
            <h3 className="pb-[3px]">{car.title}</h3>
            <p className="text-[14px] ">
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
      <GridWrapper layout="3-equal">
        <BlockWrapper className="flex gap-[16px]">
          <IconWrapper>
            <Gauge />
          </IconWrapper>
          <div className="">
            <p className="text-[14px]  pb-[8px]">Przebied</p>
            <p className="font-bold text-[24px] text-content-primary">48 230 km</p>
          </div>
        </BlockWrapper>

        <BlockWrapper className="flex gap-[16px]">
          <IconWrapper>
            <Gauge />
          </IconWrapper>
          <div className="">
            <p className="text-[14px]  pb-[8px]">Przebied</p>
            <p className="font-bold text-[24px] text-content-primary">48 230 km</p>
          </div>
        </BlockWrapper>

        <BlockWrapper className="flex gap-[16px]">
          <IconWrapper>
            <Gauge />
          </IconWrapper>
          <div className="">
            <p className="text-[14px]  pb-[8px]">Przebied</p>
            <p className="font-bold text-[24px] text-content-primary">48 230 km</p>
          </div>
        </BlockWrapper>
      </GridWrapper>

      <GridWrapper layout="2-unequal">
        <History
          data={activityArr}
          button={{
            label: 'Zobacz wszystko',
            onClick: () => {},
          }}
          title="Historia serwisowa"
        />
        <BlockWrapper className="h-fit">
          <h4 className="">Specyfikacja</h4>
          <ul className="py-[16px] border-b border-dark space-y-[10px]">
            <li className="flex gap-[8px] justify-between">
              <p className="text-[14px]">Marka</p>
              <p className="text-[14px] text-black">BMW</p>
            </li>
            <li className="flex gap-[8px] justify-between">
              <p className="text-[14px]">Marka</p>
              <p className="text-[14px] text-black">BMW</p>
            </li>
            <li className="flex gap-[8px] justify-between">
              <p className="text-[14px]">Marka</p>
              <p className="text-[14px] text-black">BMW</p>
            </li>
            <li className="flex gap-[8px] justify-between">
              <p className="text-[14px]">Marka</p>
              <p className="text-[14px] text-black">BMW</p>
            </li>
            <li className="flex gap-[8px] justify-between">
              <p className="text-[14px]">Marka</p>
              <p className="text-[14px] text-black">BMW</p>
            </li>
            <li className="flex gap-[8px] justify-between">
              <p className="text-[14px]">Marka</p>
              <p className="text-[14px] text-black">BMW</p>
            </li>
            <li className="flex gap-[8px] justify-between">
              <p className="text-[14px]">Marka</p>
              <p className="text-[14px] text-black">BMW</p>
            </li>
          </ul>
          <div className="pt-[16px]">
            <h4 className="">Notatki</h4>
            <p className="text-[14px] pt-[8px]">Samochód służbowy</p>
          </div>
        </BlockWrapper>
      </GridWrapper>
    </>
  );
}
