import { LucideIcon } from 'lucide-react';

interface ActionButtonProps {
  title: string;
  icon: LucideIcon;
  onClick: () => void;
}

export const ActionButton = ({ title, icon: Icon, onClick }: ActionButtonProps) => {
  return (
    <button
      onClick={onClick}
      className="custom-transition hover:shadow-[0_3px_13px_0_rgba(0,0,0,0.1)] w-full text-[14px] text-content-primary bg-bg-section min-h-[32px] flex items-center gap-3 px-2 cursor-pointer rounded-[7px] font-medium"
    >
      <Icon className="text-content-primary shrink-0" size={18} strokeWidth={2} />
      {title}
    </button>
  );
};
