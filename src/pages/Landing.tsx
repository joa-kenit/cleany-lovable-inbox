import { LandingHero } from "@/components/landing/Hero";
import { LandingFeatures } from "@/components/landing/Features";
import { LandingPersonalityTypes } from "@/components/landing/PersonalityTypes";
import { LandingHowItWorks } from "@/components/landing/HowItWorks";
import { LandingCTA } from "@/components/landing/CTA";
import { LandingFooter } from "@/components/landing/Footer";

const Landing = () => {
  return (
    <div className="min-h-screen bg-white">
      <LandingHero />
      <LandingFeatures />
      <LandingPersonalityTypes />
      <LandingHowItWorks />
      <LandingCTA />
      <LandingFooter />
    </div>
  );
};

export default Landing;
