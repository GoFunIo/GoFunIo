import { Control, Controller, FieldValues, Path } from 'react-hook-form';
import classNames from 'classnames';
import { Select } from './Select';

type Value = string | number | null;

type SelectOption = {
  id: number;
  value: Value;
  label: string;
  disabled?: boolean;
};

type FormSelectProps<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  label: string;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
  clearOption?: boolean;
  onValueChange?: (value: Value) => void;
};

export function FormSelect<T extends FieldValues>({
  control,
  name,
  label,
  options,
  placeholder,
  error,
  disabled,
  className,
  clearOption = false,
  onValueChange,
}: FormSelectProps<T>) {
  return (
    <div className="flex flex-col gap-1 relative pb-2">
      <div className="flex justify-between items-center">
        <label
          className={classNames(
            'text-[14px] font-medium mb-[4px]',
            error ? 'text-alert' : 'text-content-secondary',
          )}
        >
          {label}
        </label>
        {error && (
          <p className="text-[12px] text-alert font-medium absolute right-0 top-0">{error}</p>
        )}
      </div>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Select
            options={options}
            value={(field.value ?? '') as Value}
            clearOption={clearOption}
            onChange={(val) => {
              field.onChange(val ?? undefined);
              onValueChange?.(val);
            }}
            placeholder={placeholder}
            className={classNames('w-full !h-[45px]', className)}
            error={error}
            disabled={disabled}
          />
        )}
      />
    </div>
  );
}
