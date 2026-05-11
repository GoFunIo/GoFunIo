import { PricingCard } from '@/features/homepage/widgets/PricingCard';
import { Switcher } from '@/features/homepage/ui/Switcher';
import { useState } from 'react';

export const pricingPlans = [
  {
    name: 'START',
    description: 'Dla pojedynczego kierowcy z jednym lub dwoma autami.',
    price: { monthly: 29, yearly: 240 },
    buttonText: 'Wybierz plan osobisty',
    features: [
      'Do 2 pojazdów',
      'Przypomnienia o OC, AC i przeglądach',
      'Pełna cyfrowa historia serwisowa',
      'Przechowywanie zdjęć dokumentów',
      'Wsparcie mailowe',
    ],
    highlight: false,
  },
  {
    name: 'PRO',
    description: 'Dla tych, którzy chcą mieć pełną kontrolę nad kosztami.',
    price: { monthly: 59, yearly: 580 },
    buttonText: 'Aktywuj PRO',
    features: [
      'Do 10 pojazdów',
      'Przypomnienia o OC, AC i przeglądach',
      'Analityka kosztów',
      'Eksport faktur do PDF',
      'Wsparcie mailowe',
    ],
    highlight: true,
  },
  {
    name: 'BUSINESS',
    description: 'Dla firm i flot pojazdów służbowych.',
    price: { monthly: 99, yearly: 990 },
    buttonText: 'Aktywuj Business',
    features: [
      'Nielimitowana liczba pojazdów',
      'Przypomnienia o OC, AC i przeglądach',
      'Pełna cyfrowa historia serwisowa',
      'Przechowywanie zdjęć dokumentów',
      'Wsparcie mailowe',
    ],
    highlight: false,
  },
];

export const PricingSection = () => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  return (
    <section id="cennik" className="scroll-mt-20 mb-[70px] lg:mb-30">
      <div className="container mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-16">
        <div className="lg:text-center max-w-[700px] mx-auto ">
          <h2 className="mb-4 sm:mb-6">
            Proste plany <span className="text-primary">żadnych niespodzianek</span>
          </h2>
          <p className="subtitle">
            Od prywatnych kierowców po menedżerów dużych flot. Nasze plany rosną razem z liczbą
            Twoich pojazdów.
          </p>
        </div>

        <Switcher activeCycle={billingCycle} onChange={setBillingCycle} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch ">
          {pricingPlans.map((plan) => (
            <PricingCard key={plan.name} plan={plan} billingCycle={billingCycle} />
          ))}
        </div>
      </div>
    </section>
  );
};
