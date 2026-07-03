type Props = {
  message: string;
};

export const FormError = ({ message }: Props) => {
  return (
    <p className="translate-y-[-15px] w-full text-center text-[14px] font-medium text-alert">
      {message}
    </p>
  );
};
