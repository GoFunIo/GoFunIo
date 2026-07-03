import { Link } from '@tanstack/react-router';
import classNames from 'classnames';

type Props = {
  type: 'login' | 'signup';
  className?: string;
  customLabel?: string;
  hasTitle?: boolean;
};

export const AuthSwitch = ({ type, className, customLabel, hasTitle = true }: Props) => {
  return (
    <div className={classNames('flex justify-center gap-2 flex-wrap', className)}>
      {hasTitle && (
        <p className="text-[14px] font-medium">
          {type === 'login' && 'Masz juz konto?'}
          {type === 'signup' && 'Nie masz konta?'}
        </p>
      )}

      {type === 'login' && (
        <Link to="/login" className="font-medium text-[14px] text-primary">
          {customLabel ? customLabel : 'Zaloguj się'}
        </Link>
      )}

      {type === 'signup' && (
        <Link to="/signup" className="font-medium text-[14px] text-primary">
          {customLabel ? customLabel : 'Zarejestruj się'}
        </Link>
      )}
    </div>
  );
};
