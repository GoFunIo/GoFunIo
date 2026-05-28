import { Funnel } from 'lucide-react';
import { BlockWrapper } from '../ui/BlockWrapper';
import { Select } from '../ui/Select';
import { useState } from 'react';
import { DatePicker } from '../ui/DatePicker';

type Value = string | number | null;

export const Filters = () => {
  const [car, setCar] = useState<Value>(null);
  const [type, setType] = useState<Value>(null);
  const [start, setStart] = useState<Date | undefined>(undefined);
  const [end, setEnd] = useState<Date | undefined>(undefined);

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

  const typeList = [
    {
      id: 1,
      label: 'Test 1',
      value: 'qweqwe',
    },
    {
      id: 2,
      label: 'Test 2',
      value: '123123',
    },
  ];

  return (
    <BlockWrapper>
      <div className="flex items-center gap-[8px] mb-[12px]">
        <Funnel className="text-content-secondary" size={14} />
        <p className="text-[14px] text-content-secondary">Filtry</p>
      </div>
      <div className="grid xl:grid-cols-4 sm:grid-cols-2 grid-cols-1 gap-[16px]">
        <Select
          value={car}
          onChange={(value) => setCar(value)}
          placeholder="Wszystkie pojazdy"
          options={carList}
          className="w-full"
        />
        <Select
          value={type}
          onChange={(value) => setType(value)}
          placeholder="Wszystkie typy"
          options={typeList}
          className="w-full"
        />
        <DatePicker value={start} onChange={(value) => setStart(value)} className="w-full" />
        <DatePicker value={end} onChange={(value) => setEnd(value)} className="w-full" />
      </div>
    </BlockWrapper>
  );
};
