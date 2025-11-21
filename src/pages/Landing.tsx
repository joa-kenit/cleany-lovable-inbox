import { LandingHero } from "@/components/landing/Hero";
import { LandingFeatures } from "@/components/landing/Features";
import { LandingPersonalityTypes } from "@/components/landing/PersonalityTypes";
import { LandingHowItWorks } from "@/components/landing/HowItWorks";
import { LandingCTA } from "@/components/landing/CTA";
import { LandingFooter } from "@/components/landing/Footer";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

const Landing = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Redirect authenticated users to /app
  useEffect(() => {
    if (!isLoading && user) {
      navigate("/app");
    }
  }, [isLoading, user, navigate]);

  if (isLoading) {
    return null;
  }

  // Don't show landing page if user is authenticated (redirect will happen)
  if (user) {
    return null;
  }

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
