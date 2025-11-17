import { Button } from "@/components/ui/button";
import { Mail, Sparkles, Trash2, UserX } from "lucide-react";

interface HeroProps {
  onConnect: () => void;
}

export const Hero = ({ onConnect }: HeroProps) => {
  return (
    <div className="container mx-auto px-4 py-16 md:py-24">
      <div className="max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Sparkles className="h-4 w-4" />
          <span className="text-sm font-medium">Clean inbox in minutes</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
          Take Control of Your Inbox
        </h1>

        <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
          Cleany helps you quickly sort through emails with simple actions.
          Keep what matters, delete what doesn't, and unsubscribe from unwanted newsletters.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
          <Button
            size="lg"
            onClick={onConnect}
            className="text-lg px-8 shadow-lg hover:shadow-xl transition-all"
          >
            <Mail className="mr-2 h-5 w-5" />
            Connect Your Email
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500">
          <div className="bg-card p-6 rounded-xl border shadow-sm hover:shadow-md transition-shadow">
            <div className="h-12 w-12 bg-success/10 rounded-lg flex items-center justify-center mb-4 mx-auto">
              <Mail className="h-6 w-6 text-success" />
            </div>
            <h3 className="font-semibold mb-2">Keep</h3>
            <p className="text-sm text-muted-foreground">
              Mark important emails to stay in your inbox
            </p>
          </div>

          <div className="bg-card p-6 rounded-xl border shadow-sm hover:shadow-md transition-shadow">
            <div className="h-12 w-12 bg-destructive/10 rounded-lg flex items-center justify-center mb-4 mx-auto">
              <Trash2 className="h-6 w-6 text-destructive" />
            </div>
            <h3 className="font-semibold mb-2">Delete</h3>
            <p className="text-sm text-muted-foreground">
              Remove unwanted emails instantly
            </p>
          </div>

          <div className="bg-card p-6 rounded-xl border shadow-sm hover:shadow-md transition-shadow">
            <div className="h-12 w-12 bg-warning/10 rounded-lg flex items-center justify-center mb-4 mx-auto">
              <UserX className="h-6 w-6 text-warning" />
            </div>
            <h3 className="font-semibold mb-2">Unsubscribe</h3>
            <p className="text-sm text-muted-foreground">
              Stop newsletters and promotions for good
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
