import classNames from 'classnames';
import { Wrench } from 'lucide-react';
import { BoardButton } from '../ui/BoardButton';

type ButtonProps = {
  label: string;
  onClick: () => void;
};

type Props = {
  title: string;
  className?: string;
  button?: ButtonProps;
  icon?: React.ReactNode;
};

export const EmptyPlaceholder = ({ title, className, button, icon }: Props) => {
  return (
    <div className={classNames('min-h-[120px] flex rounded-[7px]', className)}>
      <div className="flex-1 justify-center flex flex-col items-center">
        {icon ?? <Wrench className="text-content-secondary" />}
        <p className="text-[14px] mt-[16px] mb-[24px]">{title}</p>
        {button && <BoardButton onClick={button.onClick}>{button.label}</BoardButton>}
      </div>
    </div>
  );
};
