import { Button } from '@/components/ui/Button';
import { Check } from 'lucide-react';

interface Plan {
  name: string;
  description: string;
  price: { monthly: number; yearly: number };
  buttonText: string;
  features: string[];
  highlight: boolean;
}

interface PricingCardProps {
  plan: Plan;
  billingCycle: 'monthly' | 'yearly';
}

export const PricingCard = ({ plan, billingCycle }: PricingCardProps) => {
  const isPro = plan.highlight;

  return (
    <div
      className={`group relative px-8 py-10  rounded-[15px] flex flex-col transition-all duration-300 border shadow-card
        ${
          isPro
            ? 'bg-primary text-white border-secondary lg:scale-y-105 z-10 hover:shadow-hover hover:-translate-y-1'
            : 'bg-bg-card text-content-primary border-transparent hover:shadow-hover hover:border-secondary hover:bg-bg-section hover:-translate-y-1'
        }
      `}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-8 items-center">
        <div className="flex flex-col">
          <div className="mb-8">
            <h4
              className={` mb-4 ${isPro ? 'text-white' : 'text-content-primary group-hover:text-primary'}`}
            >
              {plan.name}
            </h4>
            <p className={` ${isPro ? 'text-white/80' : 'text-content-secondary'}`}>
              {plan.description}
            </p>
          </div>
          <div className="mb-8 flex items-baseline gap-1">
            <span className="text-5xl font-black tracking-tight">
              {billingCycle === 'monthly' ? plan.price.monthly : plan.price.yearly}
            </span>
            <span className="text-xl font-bold">PLN</span>
            <span className={`text-[14px] ml-1  ${isPro ? 'text-white/70' : 'text-content-muted'}`}>
              /{billingCycle === 'monthly' ? 'miesiąc' : 'rok'}
            </span>
          </div>

          <Button
            className={`w-full rounded-[7px] mb-8  sm:mb-0 ${
              isPro ? 'bg-white! text-primary! hover:bg-bg-page!' : ''
            }`}
          >
            {plan.buttonText}
          </Button>
        </div>

        <ul className="space-y-4 mt-auto">
          {plan.features.map((feature, idx) => (
            <li key={idx} className="flex items-start gap-3">
              <div
                className={`flex-shrink-0 w-5 h-5 rounded-[3px] flex items-center justify-center
                ${isPro ? 'bg-white' : 'bg-primary'}`}
              >
                <Check
                  size={14}
                  strokeWidth={3}
                  className={isPro ? 'text-primary' : 'text-white'}
                />
              </div>
              <span
                className={`text-[14px] leading-[18px] ${isPro ? 'text-white/90' : 'text-content-secondary'}`}
              >
                {feature}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
