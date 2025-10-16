import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { EmailCard } from "@/components/EmailCard";
import { UnsubscribeDialog } from "@/components/UnsubscribeDialog";
import { toast } from "sonner";
import { Sparkles, Loader2, UserX } from "lucide-react";
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
  unsubscribeUrl?: string | null;
  unsubscribeMethod?: 'GET' | 'POST' | 'MAILTO';
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
  const [showUnsubscribeDialog, setShowUnsubscribeDialog] = useState(false);
  const [isProcessingUnsubscribe, setIsProcessingUnsubscribe] = useState(false);

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

  const handleClean = async () => {
    const keepCount = emails.filter((e) => e.action === "keep").length;
    const deleteCount = emails.filter((e) => e.action === "delete").length;
    const unsubscribeCount = emails.filter((e) => e.action === "unsubscribe").length;

    if (deleteCount === 0 && unsubscribeCount === 0) {
      toast.error("Please mark at least one email to delete or unsubscribe");
      return;
    }

    // If there are emails to unsubscribe, show confirmation dialog
    if (unsubscribeCount > 0) {
      setShowUnsubscribeDialog(true);
    } else {
      // Just delete
      toast.success(
        `Cleaning complete! Kept: ${keepCount}, Deleted: ${deleteCount}`
      );
      setEmails(emails.filter((e) => e.action === "keep" || e.action === null));
    }
  };

  const handleUnsubscribeConfirm = async () => {
    setIsProcessingUnsubscribe(true);
    
    try {
      const unsubscribeEmails = emails.filter((e) => e.action === "unsubscribe");
      
      // Step 1: Detect unsubscribe links
      toast.info("Detecting unsubscribe links...");
      const { data: linkData, error: linkError } = await supabase.functions.invoke(
        "process-unsubscribe",
        {
          body: {
            emails: unsubscribeEmails.map(({ id, sender, subject, snippet }) => ({
              id,
              sender,
              subject,
              snippet,
            })),
          },
        }
      );

      if (linkError) {
        console.error("Link detection error:", linkError);
        toast.error("Failed to detect unsubscribe links");
        setIsProcessingUnsubscribe(false);
        return;
      }

      // Update emails with unsubscribe links
      const linksMap = new Map(
        linkData.unsubscribeLinks.map((link: any) => [link.id, link])
      );

      const emailsWithLinks = emails.map((email) => {
        const link = linksMap.get(email.id) as { unsubscribeUrl: string | null; method: 'GET' | 'POST' | 'MAILTO' } | undefined;
        if (link) {
          return {
            ...email,
            unsubscribeUrl: link.unsubscribeUrl,
            unsubscribeMethod: link.method,
          };
        }
        return email;
      });

      setEmails(emailsWithLinks);

      // Step 2: Execute unsubscribe requests
      const unsubscribesToExecute = unsubscribeEmails
        .map((email) => {
          const link = linksMap.get(email.id) as { unsubscribeUrl: string | null; method: 'GET' | 'POST' | 'MAILTO' } | undefined;
          return link?.unsubscribeUrl
            ? {
                id: email.id,
                url: link.unsubscribeUrl,
                method: link.method,
              }
            : null;
        })
        .filter((item): item is { id: string; url: string; method: 'GET' | 'POST' | 'MAILTO' } => item !== null);

      if (unsubscribesToExecute.length === 0) {
        toast.warning("No unsubscribe links found in selected emails");
        setIsProcessingUnsubscribe(false);
        setShowUnsubscribeDialog(false);
        return;
      }

      toast.info(`Sending ${unsubscribesToExecute.length} unsubscribe requests...`);
      
      const { data: execData, error: execError } = await supabase.functions.invoke(
        "execute-unsubscribe",
        {
          body: { unsubscribes: unsubscribesToExecute },
        }
      );

      if (execError) {
        console.error("Unsubscribe execution error:", execError);
        toast.error("Failed to process unsubscribe requests");
        setIsProcessingUnsubscribe(false);
        return;
      }

      const successCount = execData.results.filter((r: any) => r.success).length;
      const failCount = execData.results.length - successCount;

      // Remove successfully unsubscribed and deleted emails
      const deleteCount = emails.filter((e) => e.action === "delete").length;
      setEmails(emails.filter((e) => e.action === "keep" || e.action === null));

      toast.success(
        `Cleaning complete! Unsubscribed: ${successCount}${
          failCount > 0 ? ` (${failCount} failed)` : ""
        }, Deleted: ${deleteCount}`
      );
    } catch (error) {
      console.error("Unsubscribe error:", error);
      toast.error("Failed to process unsubscribe requests");
    } finally {
      setIsProcessingUnsubscribe(false);
      setShowUnsubscribeDialog(false);
    }
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

      <UnsubscribeDialog
        open={showUnsubscribeDialog}
        onOpenChange={setShowUnsubscribeDialog}
        emailCount={emails.filter((e) => e.action === "unsubscribe").length}
        onConfirm={handleUnsubscribeConfirm}
        isProcessing={isProcessingUnsubscribe}
      />
    </div>
  );
};
