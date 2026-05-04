interface SocialProofBadgeProps {
  text: string;
  className?: string;
}

export const SocialProofBadge = ({ text, className = '' }: SocialProofBadgeProps) => {
  return (
    <div
      className={`
        flex items-center gap-2.5
        bg-white/70 backdrop-blur-sm
        px-5 py-2
        rounded-full
        border border-transparent
        w-fit
        ${className}
      `}
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
      </span>

      <p className="text-[12px] font-bold text-primary tracking-tight uppercase">{text}</p>
    </div>
  );
};
