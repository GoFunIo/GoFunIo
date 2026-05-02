import { createFileRoute } from '@tanstack/react-router';
import { Hero } from '@/modules/landing/Hero';
import { BenefitsSection } from '@/modules/landing/BenefitsSection';
import { AboutSection } from '@/modules/landing/AboutSection';
import { PricingSection } from '@/modules/landing/PricingSection';
import { StatsSection } from '@/modules/landing/StatsSection';
import { Testimonials } from '@/modules/landing/Testimonials';
import { CTASection } from '@/modules/landing/CTASection ';
import { FaqSection } from '@/modules/landing/FaqSection';
import { RegisterForm } from '@/modules/landing/components/Register';

export const Route = createFileRoute('/')({
  component: LandingPage,
});

function LandingPage() {
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
      <RegisterForm />
    </>
  );
}
