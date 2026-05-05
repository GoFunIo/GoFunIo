import { createFileRoute } from '@tanstack/react-router';
import { BenefitsSection } from './_components/layout/BenefitsSection';
import { Hero } from './_components/layout/Hero';
import { AboutSection } from './_components/layout/AboutSection';
import { PricingSection } from './_components/layout/PricingSection';
import { StatsSection } from './_components/layout/StatsSection';
import { Testimonials } from './_components/layout/Testimonials';
import { CTASection } from './_components/layout/CTASection ';
import { FaqSection } from './_components/layout/FaqSection';

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
