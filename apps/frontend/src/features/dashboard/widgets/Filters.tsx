import { Funnel } from 'lucide-react';
import { BlockWrapper } from '../ui/BlockWrapper';
import { Select } from '../ui/Select';
import { useState } from 'react';

type Value = string | number | null;

export const Filters = () => {
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
    <BlockWrapper>
      <div className="flex items-center gap-[8px] mb-[12px]">
        <Funnel className="text-content-secondary" size={14} />
        <p className="text-[14px] text-content-secondary">Filtry</p>
      </div>
      <div className="flex gap-[16px]">
        <Select
          value={car}
          onChange={(value) => setCar(value)}
          placeholder="Wszystkie pojazdy"
          options={carList}
        />
        <Select
          value={car}
          onChange={(value) => setCar(value)}
          placeholder="Wszystkie pojazdy"
          options={carList}
        />
      </div>
    </BlockWrapper>
  );
};
