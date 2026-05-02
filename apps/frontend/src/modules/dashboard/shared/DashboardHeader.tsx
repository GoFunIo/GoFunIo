import { BoardButton } from '../ui/BoardButton';

type ButtonProps = {
  label: string;
  onClick: () => void;
};

type Props = {
  title: string;
  subtitle: string;
  button?: ButtonProps;
};

export const DashboardHeader = ({ title, subtitle, button }: Props) => {
  return (
    <div className="flex justify-between gap-y-[16px] gap-x-[24px] flex-wrap">
      <div className="max-w-[610px]">
        <h3 className="pb-[9px]">{title}</h3>
        <p className="text-black">{subtitle}</p>
      </div>
      {button && (
        <BoardButton icon="add" onClick={button?.onClick}>
          {button?.label}
        </BoardButton>
      )}
    </div>
  );
};
