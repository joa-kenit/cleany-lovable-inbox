import { Button } from "@/components/ui/button";
import { Sparkles, Mail, ArrowDown } from "lucide-react";

interface HeroProps {
  onConnect: () => void;
}

export const Hero = ({ onConnect }: HeroProps) => {
  return (
    <section className="relative overflow-hidden px-6 py-32 lg:px-8 lg:py-48 bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50">

      {/* Background blobs */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-rose-300 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob" />
        <div className="absolute top-40 right-10 w-96 h-96 bg-orange-300 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-1/2 w-96 h-96 bg-amber-300 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob animation-delay-4000" />
      </div>

      {/* Floating basic shapes */}
      <div className="absolute top-32 right-1/4 w-20 h-20 border-4 border-rose-400 rounded-full opacity-20 animate-float-slow" />
      <div className="absolute bottom-32 left-1/4 w-16 h-16 bg-orange-400 rounded-lg opacity-20 animate-float" />
      <div className="absolute top-1/2 left-12 w-12 h-12 border-4 border-amber-400 rounded-lg opacity-20 animate-float-rotate" />

      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col items-center text-center gap-10">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm text-rose-800 px-5 py-2.5 rounded-full shadow-lg border border-rose-200 
                          opacity-0 animate-fade-in-up animation-delay-200 hover:scale-105 transition">
            <Sparkles className="w-4 h-4" />
            <span>Your inbox, decluttered</span>
          </div>

          {/* Title + Subtitle */}
          <div className="flex flex-col gap-6 opacity-0 animate-fade-in-up animation-delay-300">
            <h1 className="text-6xl lg:text-7xl xl:text-8xl tracking-tight leading-tight">
              <span className="inline-block bg-gradient-to-r from-rose-600 via-rose-700 to-orange-600 bg-clip-text text-transparent">
                Clean your inbox.
              </span>
              <br />
              <span className="inline-block bg-gradient-to-r from-orange-600 via-amber-600 to-rose-600 bg-clip-text text-transparent animation-delay-200">
                Know yourself better.
              </span>
            </h1>

            <p className="text-xl lg:text-2xl text-rose-900/80 max-w-3xl mx-auto opacity-0 animate-fade-in-up animation-delay-500">
              Cleany helps you free up space in your Gmail inbox by grouping emails by sender,
              while discovering your unique inbox personality.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 opacity-0 animate-fade-in-up animation-delay-700">
            <div className="transform transition hover:scale-105 active:scale-95">
              <Button
                size="lg"
                onClick={onConnect}
                className="bg-rose-800 hover:bg-rose-900 text-white px-8 py-6 text-lg shadow-xl shadow-rose-800/30"
              >
                <Mail className="w-5 h-5 mr-2" />
                Connect Your Email
              </Button>
            </div>

            <div className="transform transition hover:scale-105 active:scale-95">
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-rose-800 text-rose-800 hover:bg-rose-800 hover:text-white px-8 py-6 text-lg bg-white/80 backdrop-blur-sm"
              >
                Watch Demo
              </Button>
            </div>
          </div>

          {/* Bottom perks */}
          <div className="flex items-center gap-8 text-sm text-rose-900/70 opacity-0 animate-fade-in-up animation-delay-900">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-rose-800" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.7-9.3a1 1 0 00-1.4-1.4L9 10.6 7.7 9.3a1 1 0 00-1.4 1.4l2 2a1 1 0 001.4 0l4-4z" />
              </svg>
              No credit card required
            </div>

            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-rose-800" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.7-9.3a1 1 0 00-1.4-1.4L9 10.6 7.7 9.3a1 1 0 00-1.4 1.4l2 2a1 1 0 001.4 0l4-4z" />
              </svg>
              Free forever
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce-slow">
            <ArrowDown className="w-6 h-6 text-rose-400" />
          </div>

        </div>
      </div>
    </section>
  );
};
