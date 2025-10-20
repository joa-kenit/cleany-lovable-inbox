import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { EmailCard } from "@/components/EmailCard";
import { UnsubscribeDialog } from "@/components/UnsubscribeDialog";
import { WeeklySummary } from "@/components/WeeklySummary";
import { PreferencesManager } from "@/components/PreferencesManager";
import { toast } from "sonner";
import { Sparkles, Loader2, Brain, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

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

export const EmailList = () => {
  const navigate = useNavigate();
  const [emails, setEmails] = useState<Email[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showUnsubscribeDialog, setShowUnsubscribeDialog] = useState(false);
  const [isProcessingUnsubscribe, setIsProcessingUnsubscribe] = useState(false);
  const [autoApplyEnabled, setAutoApplyEnabled] = useState(true);
  const [isLoadingEmails, setIsLoadingEmails] = useState(true);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
    toast.success("Signed out successfully");
  };

  const fetchGmailEmails = async () => {
    setIsLoadingEmails(true);
    try {
      // Get the current session with provider token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        toast.error('Failed to get authentication session');
        return;
      }

      if (!session) {
        console.error('No active session');
        toast.error('Please sign in to access your emails');
        return;
      }

      // Check if provider token exists
      const providerToken = session.provider_token;
      
      if (!providerToken) {
        console.error('No provider token in session. User may need to re-authenticate with Gmail permissions.');
        toast.error('Gmail access not available. Please sign in again and grant Gmail permissions.');
        setEmails([]);
        return;
      }

      console.log('Fetching Gmail emails with provider token...');

      // Call edge function to fetch Gmail emails
      const { data, error } = await supabase.functions.invoke('fetch-gmail-emails', {
        body: { 
          providerToken,
          maxResults: 20 
        },
      });

      if (error) {
        console.error('Error fetching Gmail emails:', error);
        toast.error('Failed to fetch Gmail emails: ' + (error.message || 'Unknown error'));
        setEmails([]);
        return;
      }

      if (!data) {
        console.error('No data returned from fetch-gmail-emails');
        toast.error('No data received from Gmail');
        setEmails([]);
        return;
      }

      if (data.error) {
        console.error('Gmail API error:', data.error);
        toast.error(data.error);
        setEmails([]);
        return;
      }

      // Validate emails array with proper null checks
      if (!data.emails || !Array.isArray(data.emails)) {
        console.error('Invalid emails data structure:', data);
        toast.error('Invalid email data received');
        setEmails([]);
        return;
      }

      if (data.emails.length === 0) {
        toast.info('No emails found in your inbox');
        setEmails([]);
        return;
      }

      console.log(`Successfully fetched ${data.emails.length} emails from Gmail`);
      setEmails(data.emails);
      toast.success(`Loaded ${data.emails.length} emails from Gmail`);

    } catch (error) {
      console.error('Failed to fetch Gmail emails:', error);
      toast.error('Failed to load Gmail emails: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setEmails([]);
    } finally {
      setIsLoadingEmails(false);
    }
  };

  useEffect(() => {
    fetchGmailEmails().then(() => {
      analyzeEmails();
      if (autoApplyEnabled) {
        applyLearnedPreferences();
      }
    });
  }, []);

  const applyLearnedPreferences = async () => {
    if (emails.length === 0) return;
    
    try {
      const { data, error } = await supabase.functions.invoke("apply-preferences", {
        body: {
          emails: emails.map(({ id, sender, subject }) => ({
            id,
            sender,
            subject,
          })),
          minConfidence: 0.75,
        },
      });

      if (error) {
        console.error("Error applying preferences:", error);
        return;
      }

      if (data?.suggestions) {
        const updatedEmails = emails.map((email) => {
          const suggestion = data.suggestions.find(
            (s: any) => s.id === email.id && s.suggestedAction
          );
          if (suggestion) {
            return {
              ...email,
              action: suggestion.suggestedAction,
              aiSuggestion: {
                action: suggestion.suggestedAction,
                reason: suggestion.reason,
              },
            };
          }
          return email;
        });

        const autoAppliedCount = updatedEmails.filter(e => e.action !== null).length;
        if (autoAppliedCount > 0) {
          setEmails(updatedEmails);
          toast.success(`AI auto-applied ${autoAppliedCount} learned preferences!`, {
            icon: <Brain className="h-4 w-4" />,
          });
        }
      }
    } catch (error) {
      console.error("Failed to apply preferences:", error);
    }
  };

  const analyzeEmails = async () => {
    if (emails.length === 0) return;
    
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("classify-email", {
        body: {
          emails: emails.map(({ sender, subject, snippet }) => ({
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
        const updatedEmails = emails.map((email, index) => {
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

    // Learn from user actions
    const actionsToLearn = emails
      .filter((e) => e.action !== null)
      .map((e) => ({
        sender: e.sender,
        subject: e.subject,
        action: e.action!,
      }));

    if (actionsToLearn.length > 0) {
      try {
        await supabase.functions.invoke("learn-preferences", {
          body: { actions: actionsToLearn },
        });
        console.log("Successfully learned from user actions");
      } catch (error) {
        console.error("Failed to learn from actions:", error);
      }
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
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Your Inbox</h1>
            <p className="text-muted-foreground">
              Review your emails and choose what to keep, delete, or unsubscribe from
            </p>
          </div>
          <div className="flex items-center gap-4">
            {isAnalyzing && (
              <div className="flex items-center gap-2 text-primary">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm font-medium">AI analyzing...</span>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 space-y-6">
          <WeeklySummary />
        </div>
        <div className="lg:col-span-1">
          <PreferencesManager />
        </div>
      </div>

      {isLoadingEmails ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading your Gmail emails...</p>
        </div>
      ) : (
        <div className="space-y-3 mb-8">
          {emails.map((email) => (
            <EmailCard
              key={email.id}
              email={email}
              onActionChange={handleActionChange}
            />
          ))}
        </div>
      )}

      {emails.length === 0 && !isLoadingEmails && (
        <div className="text-center py-12">
          <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No Emails Found</h3>
          <p className="text-muted-foreground">
            Unable to load emails from your Gmail account
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
