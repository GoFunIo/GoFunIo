import classNames from 'classnames';
import { useState } from 'react';

type Value = string | number;

type Option = {
  value: Value;
  label: string;
};

type Props = {
  options: Option[];
  value: Value;
  onChange: (value: Value) => void;
  placeholder: string;
};

export const Select = ({ options = [], value, onChange, placeholder = 'Choose one' }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const selected = options.find((item) => item.value === value);

  const handleSelect = (value: Value) => {
    onChange(value);
    setIsOpen(false);
  };

  return (
    <div className="">
      <div className="" onClick={() => setIsOpen((prev) => !prev)}>
        {selected ? selected.label : placeholder}
      </div>
      {isOpen && (
        <div className="">
          {options.map((item, index) => {
            return (
              <div
                key={`${item.value}-${index}`}
                onClick={() => handleSelect(item.value)}
                className={classNames('', {
                  'text-bold': item.value === value,
                })}
              >
                {item.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
