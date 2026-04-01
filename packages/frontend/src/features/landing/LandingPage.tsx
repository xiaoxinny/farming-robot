import { NavigationBar } from "@/components/NavigationBar";
import { HeroSection } from "@/features/landing/HeroSection";
import { PricingSection } from "@/features/landing/PricingSection";
import { TeamSection } from "@/features/landing/TeamSection";
import { AboutSection } from "@/features/landing/AboutSection";
import { ContactSection } from "@/features/landing/ContactSection";

export function LandingPage() {
  return (
    <>
      <NavigationBar />
      <main>
        <HeroSection />
        <PricingSection />
        <TeamSection />
        <AboutSection />
        <ContactSection />
      </main>
    </>
  );
}
