import classNames from 'classnames';

type AvatarStackProps = {
  avatars: string[];
  size?: string;
  className?: string;
};

export const AvatarStack = ({ avatars, size = 'w-14 h-14', className }: AvatarStackProps) => {
  return (
    <div className={classNames('flex -space-x-4', className)}>
      {avatars.map((url, index) => (
        <div
          key={index}
          className={classNames(size, 'rounded-full border-2 border-white overflow-hidden')}
          style={{ zIndex: 30 - index }}
        >
          <img
            src={url}
            alt={`Użytkownik ${index + 1}`}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                `https://ui-avatars.com/api/?background=random&name=${index}`;
            }}
          />
        </div>
      ))}
    </div>
  );
};
