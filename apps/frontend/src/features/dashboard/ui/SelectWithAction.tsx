import classNames from 'classnames';
import { ArrowRight } from 'lucide-react';
import { Select } from './Select';

type Value = string | number | null;

type Option = {
  id: number;
  value: Value;
  label: string;
};

type Props = {
  options: Option[];
  value: Value;
  onChange: (value: Value) => void;
  placeholder?: string;
  clearOption?: boolean;
  onAction: (value: Value) => void;
  className?: string;
};

export const SelectWithAction = ({
  options,
  value,
  onChange,
  placeholder,
  clearOption = true,
  onAction,
  className,
}: Props) => {
  const isButtonActive = value !== null;

  const handleButtonClick = () => {
    if (isButtonActive) {
      onAction(value);
    }
  };

  const forcedSelectStyles = '!w-full !min-w-0 [&_input]:!w-full [&_input]:!min-w-0';

  return (
    <div className={classNames('flex items-center gap-2 w-full', className)}>
      <div className="flex-1 min-w-0">
        <Select
          options={options}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          clearOption={clearOption}
          className={classNames('w-full', forcedSelectStyles)}
        />
      </div>

      <button
        onClick={handleButtonClick}
        disabled={!isButtonActive}
        className={classNames(
          'w-[35px] h-[35px] rounded-[3px] text-white flex items-center justify-center transition-all duration-150 shrink-0',
          {
            'bg-primary hover:bg-secondary cursor-pointer': isButtonActive,
            'bg-primary opacity-60 cursor-not-allowed': !isButtonActive,
          },
        )}
      >
        <ArrowRight size={18} />
      </button>
    </div>
  );
};
