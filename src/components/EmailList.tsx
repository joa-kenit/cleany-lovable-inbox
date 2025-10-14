import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { EmailCard } from "@/components/EmailCard";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type EmailAction = "keep" | "delete" | "unsubscribe" | null;

export interface Email {
  id: string;
  sender: string;
  subject: string;
  snippet: string;
  action: EmailAction;
  aiSuggestion?: {
    action: EmailAction;
    reason: string;
  };
}

const mockEmails: Email[] = [
  {
    id: "1",
    sender: "newsletter@updates.com",
    subject: "Weekly Newsletter - Tech Updates",
    snippet: "Check out this week's top stories in technology and innovation...",
    action: null,
  },
  {
    id: "2",
    sender: "promo@retailstore.com",
    subject: "50% OFF Everything - Limited Time!",
    snippet: "Don't miss out on our biggest sale of the year. Shop now and save...",
    action: null,
  },
  {
    id: "3",
    sender: "john@company.com",
    subject: "Meeting Tomorrow at 10 AM",
    snippet: "Hi, just confirming our meeting scheduled for tomorrow morning...",
    action: null,
  },
  {
    id: "4",
    sender: "notifications@social.com",
    subject: "You have 23 new notifications",
    snippet: "Sarah and 22 others interacted with your posts. See what's new...",
    action: null,
  },
  {
    id: "5",
    sender: "billing@service.com",
    subject: "Your Invoice for January",
    snippet: "Please find attached your invoice for services rendered in January...",
    action: null,
  },
  {
    id: "6",
    sender: "alerts@bank.com",
    subject: "Account Security Alert",
    snippet: "We noticed a login from a new device. If this wasn't you, please...",
    action: null,
  },
];

export const EmailList = () => {
  const [emails, setEmails] = useState<Email[]>(mockEmails);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    analyzeEmails();
  }, []);

  const analyzeEmails = async () => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("classify-email", {
        body: {
          emails: mockEmails.map(({ sender, subject, snippet }) => ({
            sender,
            subject,
            snippet,
          })),
        },
      });

      if (error) {
        console.error("Classification error:", error);
        toast.error("Failed to get AI suggestions");
        return;
      }

      if (data?.classifications) {
        const updatedEmails = mockEmails.map((email, index) => {
          const classification = data.classifications.find(
            (c: any) => c.index === index
          );
          return {
            ...email,
            aiSuggestion: classification
              ? {
                  action: classification.action,
                  reason: classification.reason,
                }
              : undefined,
          };
        });
        setEmails(updatedEmails);
        toast.success("AI suggestions ready!");
      }
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("Failed to analyze emails");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleActionChange = (id: string, action: EmailAction) => {
    setEmails(
      emails.map((email) =>
        email.id === id ? { ...email, action } : email
      )
    );
  };

  const handleClean = () => {
    const keepCount = emails.filter((e) => e.action === "keep").length;
    const deleteCount = emails.filter((e) => e.action === "delete").length;
    const unsubscribeCount = emails.filter((e) => e.action === "unsubscribe").length;

    if (deleteCount === 0 && unsubscribeCount === 0) {
      toast.error("Please mark at least one email to delete or unsubscribe");
      return;
    }

    toast.success(
      `Cleaning complete! Kept: ${keepCount}, Deleted: ${deleteCount}, Unsubscribed: ${unsubscribeCount}`
    );

    // Filter out deleted and unsubscribed emails
    setEmails(emails.filter((e) => e.action === "keep" || e.action === null));
  };

  const actionsSelected = emails.some((e) => e.action !== null);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Your Inbox</h1>
            <p className="text-muted-foreground">
              Review your emails and choose what to keep, delete, or unsubscribe from
            </p>
          </div>
          {isAnalyzing && (
            <div className="flex items-center gap-2 text-primary">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm font-medium">AI analyzing...</span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3 mb-8">
        {emails.map((email) => (
          <EmailCard
            key={email.id}
            email={email}
            onActionChange={handleActionChange}
          />
        ))}
      </div>

      {emails.length === 0 && (
        <div className="text-center py-12">
          <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">All Clean!</h3>
          <p className="text-muted-foreground">
            Your inbox is looking great
          </p>
        </div>
      )}

      {emails.length > 0 && (
        <div className="sticky bottom-8 bg-card border rounded-xl p-6 shadow-lg">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              {actionsSelected
                ? `${emails.filter((e) => e.action !== null).length} of ${
                    emails.length
                  } emails marked`
                : "Mark emails to clean your inbox"}
            </div>
            <Button
              size="lg"
              onClick={handleClean}
              disabled={!actionsSelected}
              className="shadow-md"
            >
              <Sparkles className="mr-2 h-5 w-5" />
              Clean Inbox
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
