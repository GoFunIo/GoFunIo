import { Control, Controller, FieldValues, Path } from 'react-hook-form';
import classNames from 'classnames';
import { DatePicker } from './DatePicker';

const toLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

type FormDatePickerProps<T extends FieldValues> = {
  control: Control<T>;
  name: Path<T>;
  label: string;
  error?: string;
  disabled?: boolean;
  className?: string;
  maxDate?: boolean;
  clearable?: boolean;
};

export function FormDatePicker<T extends FieldValues>({
  control,
  name,
  label,
  error,
  disabled,
  className,
  maxDate,
  clearable,
}: FormDatePickerProps<T>) {
  return (
    <div
      className={classNames('flex flex-col gap-1 transition-opacity', {
        'opacity-60 select-none pointer-events-none': disabled,
      })}
    >
      <div className="flex justify-between items-center">
        <label className="text-[14px] font-medium text-content-secondary">{label}</label>
        {error && <span className="text-[12px] font-medium text-alert">{error}</span>}
      </div>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <DatePicker
            value={field.value ? new Date(field.value) : undefined}
            onChange={(date) => field.onChange(date ? toLocalDateString(date) : '')}
            className={classNames('!w-full h-[40px]', className)}
            maxDate={maxDate}
            clearable={clearable}
            error={error}
          />
        )}
      />
    </div>
  );
}
