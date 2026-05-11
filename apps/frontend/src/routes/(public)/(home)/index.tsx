import { createFileRoute } from '@tanstack/react-router';
import { BenefitsSection } from '@/features/homepage/sections/BenefitsSection';
import { Hero } from '@/features/homepage/sections/Hero';
import { AboutSection } from '@/features/homepage/sections/AboutSection';
import { PricingSection } from '@/features/homepage/sections/PricingSection';
import { StatsSection } from '@/features/homepage/sections/StatsSection';
import { Testimonials } from '@/features/homepage/sections/Testimonials';
import { CTASection } from '@/features/homepage/sections/CTASection ';
import { FaqSection } from '@/features/homepage/sections/FaqSection';

export const Route = createFileRoute('/(public)/(home)/')({
  component: Index,
});

function Index() {
  return (
    <>
      <Hero />
      <BenefitsSection />
      <AboutSection />
      <PricingSection />
      <StatsSection />
      <Testimonials />
      <CTASection />
      <FaqSection />
    </>
  );
}
