import { createFileRoute } from '@tanstack/react-router';
import { Hero } from './components/Hero';
import { BenefitsSection } from './components/BenefitsSection';
import { AboutSection } from './components/AboutSection';
import { PricingSection } from './components/PricingSection';
import { StatsSection } from './components/StatsSection';
import { Testimonials } from './components/Testimonials';
import { CTASection } from './components/CTASection ';
import { FaqSection } from './components/FaqSection';

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
