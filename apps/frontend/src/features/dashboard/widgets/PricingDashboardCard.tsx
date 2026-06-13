import { Button } from '@/components/ui/Button';
import { Check } from 'lucide-react';

interface Plan {
  name: string;
  description?: string;
  price: { monthly: number; yearly: number };
  buttonText: string;
  features: string[];
  highlight?: boolean;
}

interface PricingDashboardCardProps {
  plan: Plan;
  billingCycle: 'monthly' | 'yearly';
}

export const PricingDashboardCard = ({ plan, billingCycle }: PricingDashboardCardProps) => {
  return (
    <div className="group relative px-8 py-8 rounded-[15px] flex flex-col transition-all duration-300 border border-icon shadow-card h-full bg-bg-card">
      <div className="flex flex-col flex-1">
        <h4 className="mb-4 text-content-primary">{plan.name}</h4>

        <div className="mb-6 flex items-baseline gap-1">
          <span className="text-5xl text-content-primary tracking-tight">
            {billingCycle === 'monthly' ? plan.price.monthly : plan.price.yearly}
          </span>
          <span className="text-xl font-bold text-content-primary">PLN</span>
          <span className="text-[14px] ml-1 text-content-primary">
            /{billingCycle === 'monthly' ? 'miesiąc' : 'rok'}
          </span>
        </div>

        <Button className={`w-full rounded-[7px] mb-8 `}>{plan.buttonText}</Button>

        <ul className="space-y-4 mt-auto ">
          {plan.features.map((feature, idx) => (
            <li key={idx} className="flex items-start gap-3">
              <div className="flex-shrink-0 w-5 h-5 rounded-[3px] flex items-center justify-center bg-primary">
                <Check size={14} strokeWidth={3} className="text-white" />
              </div>
              <span className="text-[14px] leading-[18px] text-content-secondary">{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
