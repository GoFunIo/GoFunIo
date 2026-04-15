type Props = {
  value: string;
  onChange: (value: string) => void;
  type?: React.HTMLInputTypeAttribute;
  name?: string;
  placeholder?: string;
  required?: boolean;
};

export const Input = ({
  value,
  onChange,
  type = 'text',
  name,
  placeholder,
  required = false,
}: Props) => {
  return (
    <input
      type={type}
      value={value}
      name={name}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      className="border"
    />
  );
};
