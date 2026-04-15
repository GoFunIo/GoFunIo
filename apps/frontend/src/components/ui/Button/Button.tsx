type Props = {
  children: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  type?: 'button' | 'submit';
  disabled?: boolean;
};

export const Button = ({ children, onClick, type = 'button', disabled = false }: Props) => {
  return (
    <button
      onClick={onClick}
      type={type}
      disabled={disabled}
      className="min-w-[120px] border py-2 bg-gray-100 cursor-pointer"
    >
      {children}
    </button>
  );
};
