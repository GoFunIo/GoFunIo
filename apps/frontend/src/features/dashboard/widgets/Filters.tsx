import { Funnel, X } from 'lucide-react';
import { ReactNode } from 'react';

import { BlockWrapper } from '../ui/BlockWrapper';
import { BoardButton } from '../ui/BoardButton';

type FiltersProps = {
  children: ReactNode;
  hasActiveFilters?: boolean;
  onClearAll?: () => void;
};

export const Filters = ({ children, hasActiveFilters, onClearAll }: FiltersProps) => {
  return (
    <BlockWrapper>
      <div className="flex items-center justify-between gap-8 mb-[12px]">
        <div className="flex items-center gap-[8px]">
          <Funnel className="text-content-secondary" size={14} />
          <p className="text-[14px] text-content-secondary">Filtry</p>
        </div>

        {hasActiveFilters && onClearAll && (
          <BoardButton type="button" onClick={onClearAll} variant="default" size="small">
            <X size={14} />
            Wyczyść wszystkie filtry
          </BoardButton>
        )}
      </div>

      <div className="grid xl:grid-cols-4 sm:grid-cols-2 grid-cols-1 gap-[16px]">{children}</div>
    </BlockWrapper>
  );
};
