import classNames from 'classnames';
import { Wrench } from 'lucide-react';

type Props = {
  title: string;
  className?: string;
};

export const EmptyPlaceholder = ({ title, className }: Props) => {
  return (
    <div className={classNames('min-h-[120px] flex', className)}>
      <div className="flex-1 justify-center flex flex-col items-center gap-[12px]">
        <Wrench className="text-content-secondary" />
        <p className="text-[14px]">{title}</p>
      </div>
    </div>
  );
};
