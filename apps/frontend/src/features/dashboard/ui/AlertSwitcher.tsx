import classNames from 'classnames';

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
};

export const AlertSwitcher = ({ checked, onChange, disabled = false, className }: Props) => {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={classNames(
        'relative inline-flex h-[20px] w-[36px] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none',
        className,
        checked ? 'bg-primary' : 'bg-icon',
        { 'opacity-50 cursor-not-allowed pointer-events-none': disabled },
      )}
    >
      <span
        className={classNames(
          'pointer-events-none inline-block h-[16px] w-[16px] transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
          checked ? 'translate-x-[16px]' : 'translate-x-0',
        )}
      />
    </button>
  );
};
