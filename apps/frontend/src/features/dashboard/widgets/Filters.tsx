import { Funnel } from 'lucide-react';
import { ReactNode } from 'react';

import { BlockWrapper } from '../ui/BlockWrapper';

type FiltersProps = {
  children: ReactNode;
};

export const Filters = ({ children }: FiltersProps) => {
  return (
    <BlockWrapper>
      <div className="flex items-center gap-[8px] mb-[12px]">
        <Funnel className="text-content-secondary" size={14} />
        <p className="text-[14px] text-content-secondary">Filtry</p>
      </div>

      <div className="grid xl:grid-cols-4 sm:grid-cols-2 grid-cols-1 gap-[16px]">{children}</div>
    </BlockWrapper>
  );
};
