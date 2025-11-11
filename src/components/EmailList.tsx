// Rebuild v2 - force cache clear
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { EmailCard } from "@/components/EmailCard";
import { UnsubscribeDialog } from "@/components/UnsubscribeDialog";
import { CleanInboxDialog } from "@/components/CleanInboxDialog";
import { WeeklySummary } from "@/components/WeeklySummary";
import { PreferencesManager } from "@/components/PreferencesManager";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Sparkles, Loader2, Brain, LogOut, Undo } from "lucide-react";
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
  emailCount?: number;
  date?: string;
}

export const EmailList = () => {
  const navigate = useNavigate();
  const [emails, setEmails] = useState<Email[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showUnsubscribeDialog, setShowUnsubscribeDialog] = useState(false);
  const [isProcessingUnsubscribe, setIsProcessingUnsubscribe] = useState(false);
  const [autoApplyEnabled, setAutoApplyEnabled] = useState(true);
  const [isLoadingEmails, setIsLoadingEmails] = useState(true);
  const [filterTab, setFilterTab] = useState<string>("this-week");
  const [processingEmailId, setProcessingEmailId] = useState<string | null>(null);
  const [showCleanDialog, setShowCleanDialog] = useState(false);
  const [isCleaningInbox, setIsCleaningInbox] = useState(false);
  const [undoStack, setUndoStack] = useState<Array<{ emails: Email[], action: string }>>([]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
    toast.success("Signed out successfully");
  };

  const fetchGmailEmails = async () => {
    setIsLoadingEmails(true);
    try {
      console.log('[Gmail Fetch] Starting Gmail email fetch...');
      
      // Get the current session with provider token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('[Gmail Fetch] Session error:', sessionError);
        toast.error('Failed to get authentication session');
        setEmails([]);
        return;
      }

      if (!session) {
        console.error('[Gmail Fetch] No active session found');
        toast.error('Please sign in to access your emails');
        setEmails([]);
        return;
      }

      console.log('[Gmail Fetch] Session found, checking for provider token...');
      
      // Check if provider token exists
      const providerToken = session.provider_token;
      
      if (!providerToken) {
        console.error('[Gmail Fetch] No provider token in session. Session data:', {
          hasUser: !!session.user,
          provider: session.user?.app_metadata?.provider,
          providers: session.user?.app_metadata?.providers
        });
        toast.error('Gmail access not available. Please sign out and sign in again with Gmail permissions.');
        setEmails([]);
        return;
      }

      console.log('[Gmail Fetch] Provider token found, calling edge function...');

      // Call edge function to fetch Gmail emails
      const { data, error } = await supabase.functions.invoke('fetch-gmail-emails', {
        body: { 
          providerToken,
          maxResults: 20 
        },
      });

      console.log('[Gmail Fetch] Edge function response:', { 
        hasData: !!data, 
        hasError: !!error,
        dataKeys: data ? Object.keys(data) : [],
      });

      if (error) {
        console.error('[Gmail Fetch] Edge function error:', error);
        toast.error('Failed to fetch Gmail emails: ' + (error.message || 'Unknown error'));
        setEmails([]);
        return;
      }

      if (!data) {
        console.error('[Gmail Fetch] No data returned from edge function');
        toast.error('No data received from Gmail');
        setEmails([]);
        return;
      }

      if (data.error) {
        console.error('[Gmail Fetch] Gmail API error from edge function:', data.error);
        toast.error(data.error);
        setEmails([]);
        return;
      }

      // Validate emails array with proper null checks
      if (!data.emails || !Array.isArray(data.emails)) {
        console.error('[Gmail Fetch] Invalid emails data structure:', data);
        toast.error('Invalid email data received');
        setEmails([]);
        return;
      }

      if (data.emails.length === 0) {
        console.log('[Gmail Fetch] No emails found in inbox');
        toast.info('No emails found in your inbox');
        setEmails([]);
        return;
      }

      console.log(`[Gmail Fetch] Successfully fetched ${data.emails.length} emails from Gmail`);
      setEmails(data.emails);
      toast.success(`Loaded ${data.emails.length} emails from Gmail`);

    } catch (error) {
      console.error('[Gmail Fetch] Unexpected error:', error);
      toast.error('Failed to load Gmail emails: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setEmails([]);
    } finally {
      setIsLoadingEmails(false);
    }
  };

  // Helper function to detect newsletter emails
  const isNewsletterEmail = (email: Email): boolean => {
    const newsletterKeywords = ['newsletter', 'subscription', 'digest', 'weekly', 'monthly', 'unsubscribe'];
    const subjectLower = email.subject.toLowerCase();
    const senderLower = email.sender.toLowerCase();
    
    return newsletterKeywords.some(keyword => 
      subjectLower.includes(keyword) || senderLower.includes(keyword)
    ) || !!email.unsubscribeUrl;
  };

  // Filter emails based on selected tab
  const getFilteredEmails = () => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    switch (filterTab) {
      case "all":
        return emails;
      case "this-week":
        return emails.filter(email => {
          if (!email.date) return true; // Include if no date
          return new Date(email.date) >= oneWeekAgo;
        });
      case "this-month":
        return emails.filter(email => {
          if (!email.date) return true; // Include if no date
          return new Date(email.date) >= oneMonthAgo;
        });
      case "newsletters":
        return emails.filter(isNewsletterEmail);
      case "most-frequent":
        return emails; // Will be sorted after grouping
      default:
        return emails;
    }
  };

  const filteredEmails = getFilteredEmails();

  // Group emails by sender and keep only the most recent one
  const groupedEmails = filteredEmails.reduce((acc, email) => {
    const sender = email.sender;
    if (!acc[sender]) {
      acc[sender] = { email, count: 1 };
    } else {
      // Keep the most recent (assuming later in array = more recent)
      acc[sender] = { email, count: acc[sender].count + 1 };
    }
    return acc;
  }, {} as Record<string, { email: Email; count: number }>);

  let displayEmails = Object.values(groupedEmails).map(({ email, count }) => ({
    ...email,
    emailCount: count,
  }));

  // Sort by frequency if "most-frequent" tab is selected
  if (filterTab === "most-frequent") {
    displayEmails = displayEmails.sort((a, b) => (b.emailCount || 0) - (a.emailCount || 0));
  }

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

const handleImmediateDelete = async (id: string, sender: string) => {
  // Save current state for undo
  const previousEmails = [...emails];

  // Remove email immediately (optimistic update)
  const updatedEmails = emails.filter(email => email.id !== id);
  setEmails(updatedEmails);

  try {
    // Get the access token
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.provider_token;

    if (!accessToken) {
      throw new Error('No access token available');
    }

    // Find all email IDs from this sender
    const emailsToDelete = emails.filter(email => email.sender === sender);
    
    // Delete each email from Gmail
    for (const email of emailsToDelete) {
      const gmailId = email.id.split('-')[0]; // Extract Gmail message ID
      await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${gmailId}/trash`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
    }

    // Show success toast with undo
    const toastId = toast.success(`Deleted emails from ${sender}`, {
      duration: 5000,
      action: {
        label: "Undo",
        onClick: () => {
          setEmails(previousEmails);
          toast.info("Delete undone");
        },
      },
    });
  } catch (error) {
    console.error('Error deleting emails:', error);
    // Restore previous state on error
    setEmails(previousEmails);
    toast.error('Failed to delete emails. Please try again.');
  }
};

const handleImmediateUnsubscribe = async (id: string, sender: string) => {
  setProcessingEmailId(id);
  
  try {
    const email = emails.find(e => e.id === id);
    if (!email) {
      toast.error('Email not found');
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.provider_token;
    
    if (!accessToken) {
      throw new Error('No access token available');
    }

    const gmailId = email.id.split('-')[0];
    
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${gmailId}?format=full`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch email details');
    }

const emailData = await response.json();
const headers = emailData.payload.headers;

// 🧩 Step 1: Define protected system senders & keywords FIRST
const SYSTEM_DOMAINS = [
  "google.com",
  "gmail.com",
  "paypal.com",
  "amazon.com",
  "apple.com",
  "microsoft.com",
  "github.com",
  "linkedin.com",
  "facebook.com",
  "x.com",
  "twitter.com",
  "instagram.com",
  "bankofamerica.com",
  "chase.com",
  "wellsfargo.com",
  "stripe.com",
  "notion.so",
  "openai.com",
  "supabase.io",
  "vercel.com"
];

const SYSTEM_KEYWORDS = [
  "security alert",
  "password",
  "verification code",
  "two-factor",
  "receipt",
  "invoice",
  "payment",
  "order confirmation",
  "purchase",
  "login",
  "notification",
  "access granted"
];

// 🧠 Step 2: Skip unsubscribe for system/transactional emails
const senderDomain = emailData?.payload?.headers
  ?.find((h: any) => h.name.toLowerCase() === 'from')
  ?.value?.split('@')[1]
  ?.toLowerCase();

const subject =
  emailData?.payload?.headers?.find(
    (h: any) => h.name.toLowerCase() === 'subject'
  )?.value || "";

const isSystemEmail =
  SYSTEM_DOMAINS.some(domain => senderDomain?.includes(domain)) ||
  SYSTEM_KEYWORDS.some(keyword =>
    subject.toLowerCase().includes(keyword)
  );

if (isSystemEmail) {
  console.log("🧠 Skipping unsubscribe for system email:", senderDomain);
  toast.info("Skipping unsubscribe: this looks like a system email");
  return; // 🚀 Stop here — don't process unsubscribe links
}

// 🧩 Step 3: Continue detecting unsubscribe links
const listUnsubHeader = headers.find(
  (h: any) => h.name.toLowerCase() === 'list-unsubscribe'
);

let unsubscribeUrl = null;

if (listUnsubHeader) {
  const value = listUnsubHeader.value.replace(/[<>]/g, '').trim();
  const links = value.split(',').map((l: string) => l.trim());
  unsubscribeUrl = links.find((l: string) => l.startsWith('http')) || links[0];
}

if (!unsubscribeUrl || unsubscribeUrl.startsWith('mailto:')) {
  const bodyPart = emailData.payload.parts?.find(
    (p: any) => p.mimeType === 'text/html' || p.mimeType === 'text/plain'
  ) || emailData.payload;

  if (bodyPart.body?.data) {
    const decodedBody = atob(bodyPart.body.data.replace(/-/g, '+').replace(/_/g, '/'));

  
  // DEBUG: Log the decoded body to see what we're working with
  console.log('[Unsubscribe Debug] Email body length:', decodedBody.length);
  console.log('[Unsubscribe Debug] Searching for unsubscribe links...');
  console.log('[Unsubscribe Debug] Body preview:', decodedBody.substring(0, 500));
        
// UNIVERSAL UNSUBSCRIBE DETECTOR
const linkRegex = /https?:\/\/[^\s"'<>]+/gi;
const allLinks = decodedBody.match(linkRegex) || [];

const unsubscribeKeywords = /(unsubscribe|opt.?out|remove|manage.?pref|notification|v=off|optin=0)/i;
const knownRedirectors = /(link\.|click\.|email\.|u\.|campaign\.)/i;

let unsubscribeCandidates = allLinks.filter(
  link =>
    unsubscribeKeywords.test(link) ||
    knownRedirectors.test(link)
);

console.log("[Unsubscribe Debug] All links found:", allLinks.length);
console.log("[Unsubscribe Debug] Unsubscribe candidates:", unsubscribeCandidates);

for (const link of unsubscribeCandidates) {
  if (unsubscribeKeywords.test(link)) {
    unsubscribeUrl = link;
    break;
  }
}

// fallback: if nothing matched but we found candidates, take the first one
if (!unsubscribeUrl && unsubscribeCandidates.length > 0) {
  unsubscribeUrl = unsubscribeCandidates[0];
  console.log("[Unsubscribe Debug] Using fallback unsubscribe link:", unsubscribeUrl);
}

// Optional: follow redirects to confirm
if (unsubscribeUrl && !unsubscribeKeywords.test(unsubscribeUrl)) {
  try {
    const res = await fetch(unsubscribeUrl, { method: "HEAD", redirect: "follow" });
    if (unsubscribeKeywords.test(res.url)) {
      unsubscribeUrl = res.url;
      console.log("[Unsubscribe Debug] Confirmed final unsubscribe URL:", unsubscribeUrl);
    }
  } catch (err: any) {
    const msg = err.message || "";
    // Gracefully handle CORS blocks and network errors
    if (msg.includes("Failed to fetch") || msg.includes("CORS") || msg.includes("NetworkError")) {
      console.warn("[Unsubscribe Debug] Skipping link due to CORS restriction:", unsubscribeUrl);
    } else {
      console.warn("[Unsubscribe Debug] Redirect check failed:", msg);
    }
  }
}

// 🧩 EXTRA SAFETY: Detect expired or tokenized unsubscribe links
if (unsubscribeUrl) {
  // 1️Skip obvious temporary unsubscribe links (contain tokens)
  if (unsubscribeUrl.includes("token=")) {
    console.warn("[Unsubscribe Debug] Tokenized unsubscribe link likely expired, skipping:", unsubscribeUrl);
    unsubscribeUrl = null;
  } else {
    try {
      const res = await fetch(unsubscribeUrl);
      const text = await res.text();

      // 2Detect pages indicating expired/invalid unsubscribe links
      if (/expired|invalid|oops/i.test(text)) {
        console.warn("[Unsubscribe Debug] Link appears expired:", unsubscribeUrl);
        unsubscribeUrl = null;
      }
    } catch (err) {
      console.warn("[Unsubscribe Debug] Fetch error:", err.message);
    }
  }
}

//  3Fallback: try "List-Unsubscribe" header if available
if (!unsubscribeUrl && emailData?.payload?.headers) {
  const listHeader = emailData.payload.headers.find(h => h.name === "List-Unsubscribe");
  if (listHeader && listHeader.value.includes("https")) {
    const match = listHeader.value.match(/https?:\/\/[^\s<>]+/i);
    if (match) {
      unsubscribeUrl = match[0];
      console.log("[Unsubscribe Debug] Using List-Unsubscribe header link:", unsubscribeUrl);
    }
  }
}


      }
    }

    if (!unsubscribeUrl) {
      toast.error('No unsubscribe link found', {
        description: 'Try manually searching the email for an unsubscribe link',
        duration: 5000,
      });
      return;
    }

    if (unsubscribeUrl.startsWith('mailto:')) {
      window.open(unsubscribeUrl);
      toast.info('Opening email client to unsubscribe');
      return;
    }

    if (unsubscribeUrl.startsWith('http')) {
      window.open(unsubscribeUrl, '_blank');
      
      const updatedEmails = emails.map(e => 
        e.sender === sender 
          ? { ...e, action: 'unsubscribe' as EmailAction }
          : e
      );
      setEmails(updatedEmails);

      toast.success(`Opening unsubscribe page for ${sender}`, {
        description: 'Complete the process on the opened page',
        duration: 5000,
      });
    } else {
      toast.error('Unsupported unsubscribe format');
    }

  } catch (error) {
    console.error('Error:', error);
    toast.error('Failed to unsubscribe');
  } finally {
    setProcessingEmailId(null);
  }
};

  const handleClean = async () => {
    const keepCount = emails.filter((e) => e.action === "keep").length;
    const deleteCount = emails.filter((e) => e.action === "delete").length;
    const unsubscribeCount = emails.filter((e) => e.action === "unsubscribe").length;

    if (deleteCount === 0 && unsubscribeCount === 0) {
      toast.error("Please mark at least one email to delete or unsubscribe");
      return;
    }

    // Show confirmation dialog
    setShowCleanDialog(true);
  };

  const handleCleanConfirm = async () => {
    setIsCleaningInbox(true);
    const deleteCount = emails.filter((e) => e.action === "delete").length;
    const unsubscribeCount = emails.filter((e) => e.action === "unsubscribe").length;

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

    // Process unsubscribes if any
    if (unsubscribeCount > 0) {
      await processUnsubscribes();
    }

    // Remove deleted and unsubscribed emails
    const updatedEmails = emails.filter((e) => e.action === "keep" || e.action === null);
    setEmails(updatedEmails);

    // Show success
    toast.success(
      `Successfully cleaned! Deleted: ${deleteCount}, Unsubscribed: ${unsubscribeCount}`
    );

    setIsCleaningInbox(false);
    setShowCleanDialog(false);
  };

  const processUnsubscribes = async () => {

    try {
      const unsubscribeEmails = emails.filter((e) => e.action === "unsubscribe");
      
      // Step 1: Detect unsubscribe links
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
        return;
      }

      // Step 2: Execute unsubscribe requests
      const linksMap = new Map(
        linkData.unsubscribeLinks.map((link: any) => [link.id, link])
      );

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

      if (unsubscribesToExecute.length > 0) {
        await supabase.functions.invoke(
          "execute-unsubscribe",
          {
            body: { unsubscribes: unsubscribesToExecute },
          }
        );
      }
    } catch (error) {
      console.error("Unsubscribe error:", error);
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

      <Tabs value={filterTab} onValueChange={setFilterTab} className="mb-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All Senders</TabsTrigger>
          <TabsTrigger value="this-week">This Week</TabsTrigger>
          <TabsTrigger value="this-month">This Month</TabsTrigger>
          <TabsTrigger value="newsletters">Newsletters</TabsTrigger>
          <TabsTrigger value="most-frequent">Most Frequent</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoadingEmails ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading your Gmail emails...</p>
        </div>
      ) : (
        <div className="space-y-3 mb-8">
          {displayEmails.map((email) => (
            <EmailCard
              key={email.id}
              email={email}
              onActionChange={handleActionChange}
              onDelete={handleImmediateDelete}
              onUnsubscribe={handleImmediateUnsubscribe}
              emailCount={email.emailCount}
              isProcessing={processingEmailId === email.id}
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
          <p className="text-muted-foreground mb-6">
            Unable to load emails from your Gmail account. This could be because:
          </p>
          <ul className="text-sm text-muted-foreground mb-6 text-left max-w-md mx-auto space-y-2">
            <li>• Your Gmail access token may have expired</li>
            <li>• You need to grant Gmail permissions</li>
            <li>• There's a temporary connection issue</li>
          </ul>
          <div className="flex gap-3 justify-center">
            <Button onClick={fetchGmailEmails} size="lg">
              <Loader2 className="h-5 w-5 mr-2" />
              Retry Loading Emails
            </Button>
            <Button onClick={handleSignOut} variant="outline" size="lg">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out & Re-authenticate
            </Button>
          </div>
        </div>
      )}

      {displayEmails.length > 0 && (
        <div className="sticky bottom-8 bg-card border rounded-xl p-6 shadow-lg">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              {actionsSelected
                ? `${emails.filter((e) => e.action !== null).length} of ${
                    emails.length
                  } emails marked (${displayEmails.length} unique senders)`
                : `${displayEmails.length} unique senders - Mark emails to clean your inbox`}
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

      <CleanInboxDialog
        open={showCleanDialog}
        onOpenChange={setShowCleanDialog}
        deleteCount={emails.filter((e) => e.action === "delete").length}
        unsubscribeCount={emails.filter((e) => e.action === "unsubscribe").length}
        onConfirm={handleCleanConfirm}
        isProcessing={isCleaningInbox}
      />
    </div>
  );
};
