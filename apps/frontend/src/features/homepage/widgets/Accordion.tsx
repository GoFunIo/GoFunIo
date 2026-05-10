import { ChevronDown } from 'lucide-react';
import classNames from 'classnames';

type AccordionItemProps = {
  title: string;
  children: React.ReactNode;
  isOpen?: boolean;
  onClick?: () => void;
};

export const Accordion = ({ title, children, isOpen, onClick }: AccordionItemProps) => {
  return (
    <div
      className={classNames(
        ' group border  rounded-[7px] overflow-hidden transition-all duration-300 ',
        {
          'border-primary bg-bg-section': isOpen,
          'border-icon bg-bg-card hover:bg-bg-section hover:border-primary': !isOpen,
        },
      )}
    >
      <button
        type="button"
        className="flex w-full items-center justify-between px-6 py-5 text-left "
        onClick={onClick}
      >
        <span className="text-[16px] font-medium text-content-primary">{title}</span>
        <ChevronDown
          className={classNames(
            'h-5 w-5 shrink-0 text-icon transition-transform duration-300 ease-in-out',
            'group-hover:text-primary',
            isOpen ? 'text-primary rotate-180' : 'text-icon',
          )}
        />
      </button>

      <div
        className={classNames(
          'grid transition-all duration-300 ease-in-out',
          isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
        )}
      >
        <div className="overflow-hidden">
          <div className="mx-6 border-t border-icon" />
          <div className="px-6 py-6 text-[16px] text-content-secondary ">{children}</div>
        </div>
      </div>
    </div>
  );
};
