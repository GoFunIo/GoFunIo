interface SwitcherProps {
  activeCycle: 'monthly' | 'yearly';
  onChange: (cycle: 'monthly' | 'yearly') => void;
}

export const Switcher = ({ activeCycle, onChange }: SwitcherProps) => {
  return (
    <div className="flex justify-center mt-6 mb-6">
      <div className="inline-flex bg-primary p-1 rounded-full relative items-center">
        <div
          className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-full transition-transform duration-300 ease-in-out shadow-sm
          ${activeCycle === 'monthly' ? 'translate-x-0' : 'translate-x-full'}`}
        />

        <button
          onClick={() => onChange('monthly')}
          className={`relative z-10 px-8 py-2.5 rounded-full text-[12px] font-bold tracking-wider transition-colors duration-300 cursor-pointer
          ${activeCycle === 'monthly' ? 'text-primary' : 'text-white'}`}
        >
          MIESIĘCZNIE
        </button>

        <button
          onClick={() => onChange('yearly')}
          className={`relative z-10 px-8 py-2.5 rounded-full text-[12px] font-bold tracking-wider transition-colors duration-300 cursor-pointer
          ${activeCycle === 'yearly' ? 'text-primary' : 'text-white'}`}
        >
          ROCZNIE
        </button>
      </div>
    </div>
  );
};
