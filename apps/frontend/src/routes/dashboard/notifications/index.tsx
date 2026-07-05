import { BoardButton } from '@/features/dashboard/ui/BoardButton';
import { Select } from '@/features/dashboard/ui/Select';
import { DashboardHeader } from '@/features/dashboard/widgets/DashboardHeader';
import { Reminders } from '@/features/dashboard/widgets/Reminders';
import { mockCars } from '@/store/cars';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

type Value = string | number | null;

export const Route = createFileRoute('/dashboard/notifications/')({
  component: RouteComponent,
});

function RouteComponent() {
  const [car, setCar] = useState<Value>(null);
  const carList = [
    {
      id: 1,
      label: 'Toyota Corolla',
      value: 'toyota-corolla',
    },
    {
      id: 2,
      label: 'BMW e60',
      value: 'bmw-e60',
    },
  ];

  return (
    <>
      <DashboardHeader title="Alerty" subtitle="Centrum alertów: przeglądy i ubezpieczenia." />
      <div className="flex justify-between gap-[24px] items-center flex-wrap">
        <div className="flex items-center">
          <h2 className="text-[14px] font-bold text-dark mr-[24px]">Typ: </h2>
          <div className="flex gap-[18px] flex-wrap">
            <BoardButton size="small" variant="default">
              Wszystkie
            </BoardButton>
            <BoardButton size="small" variant="outline">
              Przeglądy technicze
            </BoardButton>
            <BoardButton size="small" variant="outline">
              Ubezpieczenia
            </BoardButton>
          </div>
        </div>
        <div className="flex items-center justify-end flex-1">
          <h2 className="text-[14px] font-bold text-dark mr-[24px]">Pojazd:</h2>
          <Select
            value={car}
            onChange={(value) => setCar(value)}
            placeholder="Wszystkie pojazdy"
            options={carList}
            className="w-full sm:min-w-[320px]"
          />
        </div>
      </div>
      <div className="">
        <Reminders data={mockCars} />
      </div>
    </>
  );
}
