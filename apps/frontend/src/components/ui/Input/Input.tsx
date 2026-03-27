type Props = {
  value: string;
  onChange: (value: string) => void;
  type?: React.HTMLInputTypeAttribute;
  name?: string;
  placeholder?: string;
};

export const Input = ({ value, onChange, type = 'text', name, placeholder }: Props) => {
  return (
    <input
      type={type}
      value={value}
      name={name}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
};
