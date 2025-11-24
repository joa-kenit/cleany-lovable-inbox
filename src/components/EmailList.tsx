// Rebuild v2 - force cache clear
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { EmailCard } from "@/components/EmailCard";
import { UnsubscribeDialog } from "@/components/UnsubscribeDialog";
import { CleanInboxDialog } from "@/components/CleanInboxDialog";
import { WeeklySummary } from "@/components/WeeklySummary";
import { PreferencesManager } from "@/components/PreferencesManager";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Sparkles, Loader2, Brain, LogOut, Undo } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { analyzeInboxPersonality, calculatePercentages, type CategoryCounts, type CategoryPercentages } from "@/lib/categoryAnalyzer";

function decodeBase64Utf8(str: string) {
  try {
    // Decode base64 safely
    const decoded = atob(str.replace(/-/g, '+').replace(/_/g, '/'));

    // Try to decode UTF-8 bytes properly
    const utf8decoded = new TextDecoder("utf-8").decode(
      Uint8Array.from(decoded, c => c.charCodeAt(0))
    );

    // Clean artifacts & normalize whitespace
    return utf8decoded
      .replace(/[^\x00-\x7F]+/g, " ") // removes non-ASCII junk
      .replace(/\s+/g, " ")           // collapses excess spaces
      .trim();
  } catch (e) {
    console.warn("Decoding fallback:", e);
    return atob(str.replace(/-/g, '+').replace(/_/g, '/'));
  }
}

const collectAllHeaders = (payload: any): any[] => {
  if (!payload) return [];
  const own = payload.headers || [];
  const parts = Array.isArray(payload.parts)
    ? payload.parts.flatMap((p: any) => collectAllHeaders(p))
    : [];
  return [...own, ...parts];
};


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
  isNewsletter?: boolean;
}

export interface SenderLoadState {
  emails: Email[];
  totalCount: number;
  nextPageToken: string | null;
  fullyLoaded: boolean;
}

const INBOX_CACHE_KEY = "cleany_inbox_cache_v4";
const INBOX_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

interface InboxCache {
  emails: Email[];
  senderState: Record<string, SenderLoadState>;
  timestamp: number;
}

const loadInboxCache = (): InboxCache | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(INBOX_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as InboxCache;
    if (!parsed.timestamp || Date.now() - parsed.timestamp > INBOX_CACHE_TTL) {
      window.localStorage.removeItem(INBOX_CACHE_KEY);
      return null;
    }
    return parsed;
  } catch (error) {
    console.error("[Inbox Cache] Failed to load cache", error);
    return null;
  }
};

const saveInboxCache = (cache: InboxCache) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(INBOX_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error("[Inbox Cache] Failed to save cache", error);
  }
};

const clearInboxCache = () => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(INBOX_CACHE_KEY);
  } catch (error) {
    console.error("[Inbox Cache] Failed to clear cache", error);
  }
};

export const EmailList = () => {
  const navigate = useNavigate();
  const [emails, setEmails] = useState<Email[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showUnsubscribeDialog, setShowUnsubscribeDialog] = useState(false);
  const [isProcessingUnsubscribe, setIsProcessingUnsubscribe] = useState(false);
  const [autoApplyEnabled, setAutoApplyEnabled] = useState(true);
  const [isLoadingEmails, setIsLoadingEmails] = useState(true);
  const [filterTab, setFilterTab] = useState<string>("all-senders");
  const [dateRange, setDateRange] = useState<string>("all-time");
  const [processingEmailId, setProcessingEmailId] = useState<string | null>(null);
  const [showCleanDialog, setShowCleanDialog] = useState(false);
  const [isCleaningInbox, setIsCleaningInbox] = useState(false);
  const [undoStack, setUndoStack] = useState<Array<{ emails: Email[], action: string }>>([]);
  const [displayLimit, setDisplayLimit] = useState(20);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadingMoreSender, setLoadingMoreSender] = useState<string | null>(null);
  const [senderState, setSenderState] = useState<Record<string, SenderLoadState>>({});
  const [categoryPercentages, setCategoryPercentages] = useState<CategoryPercentages>({
    entrepreneurship: 0,
    technology: 0,
    lifestyle: 0,
    fitness: 0,
    finance: 0,
    marketing: 0,
    other: 0,
  });
  const [personalitySummary, setPersonalitySummary] = useState<string>("");
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

const cleanEmailSnippet = (snippet: string): string => {
  // Remove URLs
  let cleaned = snippet.replace(/https?:\/\/[^\s]+/g, '');
  // Remove excessive whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  // Remove common email artifacts
  cleaned = cleaned.replace(/\[.*?\]/g, '');
  return cleaned;
};
  
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
    toast.success("Signed out successfully");
  };

  const generatePersonalitySummary = async () => {
    setIsGeneratingSummary(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-personality-summary', {
        body: { percentages: categoryPercentages }
      });

      if (error) {
        console.error('Error generating summary:', error);
        toast.error('Failed to generate personality summary');
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (data?.summary) {
        setPersonalitySummary(data.summary);
        toast.success('Personality summary generated!');
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error('Failed to generate personality summary');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const loadMoreEmails = async (sender: string) => {
    setLoadingMoreSender(sender);
    try {
      console.log('[Load More] Loading more emails for sender:', sender);
      
      // Get the current session with provider token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('[Load More] Session error:', sessionError);
        toast.error('Failed to get authentication session');
        return;
      }

      const providerToken = session.provider_token;
      if (!providerToken) {
        toast.error('Gmail access not available');
        return;
      }

      // Get current state for this sender
      const currentState = senderState[sender];
      if (!currentState) {
        console.error('[Load More] No state found for sender:', sender);
        return;
      }

      // Check if already fully loaded or at 100 email cap
      if (currentState.fullyLoaded || currentState.emails.length >= 100) {
        toast.info('All available emails loaded for this sender');
        return;
      }

      console.log('[Load More] Calling fetch-sender-emails with pageToken:', currentState.nextPageToken);

      // Fetch next batch of message IDs for this sender
      const { data: senderData, error: senderError } = await supabase.functions.invoke('fetch-sender-emails', {
        body: {
          providerToken,
          sender,
          maxResults: 5,
          pageToken: currentState.nextPageToken,
        },
      });

      if (senderError || !senderData) {
        console.error('[Load More] Error:', senderError);
        toast.error('Failed to load more emails');
        return;
      }

      if (!senderData.messages || senderData.messages.length === 0) {
        setSenderState(prev => ({
          ...prev,
          [sender]: {
            ...prev[sender],
            fullyLoaded: true,
          },
        }));
        toast.info('No more emails to load for this sender');
        return;
      }

      console.log('[Load More] Fetched', senderData.messages.length, 'message IDs');

      // Fetch full details for each message
      const messageDetails = await Promise.all(
        senderData.messages.map(async (msg: { id: string }) => {
          const detailUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`;
          const response = await fetch(detailUrl, {
            headers: { 'Authorization': `Bearer ${providerToken}` },
          });
          return response.json();
        })
      );

      // Process messages into Email objects
      const processedEmails: Email[] = messageDetails.map((msg: any) => {
        const payload = msg.payload || {};
        const headers = collectAllHeaders(payload);

        const fromHeader = headers.find((h: any) => h.name.toLowerCase() === 'from');
        const subjectHeader = headers.find((h: any) => h.name.toLowerCase() === 'subject');
        const dateHeader = headers.find((h: any) => h.name.toLowerCase() === 'date');
        const unsubHeader = headers.find((h: any) => h.name.toLowerCase() === 'list-unsubscribe');

        const senderValue = fromHeader?.value || 'Unknown';
        const rawSubject = (subjectHeader?.value || '').trim();
        const snippet = msg.snippet || '';

        let subject = rawSubject;
        if (!subject) {
          const decodedBody = payload.body?.data ? decodeBase64Utf8(payload.body.data) : '';
          const bodyFirstLine = decodedBody.split('\n').find((line) => line.trim().length > 0) || '';
          const cleanedSnippet = cleanEmailSnippet(snippet);
          const fallback = cleanEmailSnippet(bodyFirstLine) || cleanedSnippet;
          subject = fallback || cleanedSnippet || 'No subject';
        }
        
        // Detect newsletter based on sender/subject
        const newsletterPlatforms = ['substack', 'beehiiv', 'convertkit', 'mailchimp', 'buttondown', 'ghost.io', 'revue'];
        const senderLower = senderValue.toLowerCase();
        const subjectLower = subject.toLowerCase();
        const isNewsletter = newsletterPlatforms.some(platform => senderLower.includes(platform)) ||
                             (subjectLower.includes('newsletter') || subjectLower.includes('digest'));

        return {
          id: msg.id,
          sender: senderValue,
          subject,
          snippet,
          action: null,
          date: dateHeader?.value,
          unsubscribeUrl: unsubHeader?.value || null,
          isNewsletter,
        };
      });

      // Update emails array
      setEmails(prevEmails => {
        const existingIds = new Set(prevEmails.map(e => e.id));
        const newEmails = processedEmails.filter(e => !existingIds.has(e.id));
        return [...prevEmails, ...newEmails];
      });

      // Update sender state but preserve existing totalCount
      setSenderState(prev => {
        const current = prev[sender] || currentState;
        const currentEmails = current.emails || [];
        const existingIds = new Set(currentEmails.map(e => e.id));
        const newEmails = processedEmails.filter(e => !existingIds.has(e.id));
        const updatedEmails = [...currentEmails, ...newEmails];
        
        const fullyLoaded = !senderData.nextPageToken || updatedEmails.length >= 100;

        return {
          ...prev,
          [sender]: {
            ...current,
            emails: updatedEmails.slice(0, 100), // Cap at 100
            nextPageToken: senderData.nextPageToken || null,
            fullyLoaded,
          },
        };
      });

      toast.success(`Loaded ${processedEmails.length} more emails from ${sender.split('<')[0].trim()}`);

    } catch (error) {
      console.error('[Load More] Unexpected error:', error);
      toast.error('Failed to load more emails');
    } finally {
      setLoadingMoreSender(null);
    }
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

      console.log('[Gmail Fetch] Provider token found, fetching unique senders...');

      // First, get a list of unique senders (fetch 100 emails to get good sender coverage)
      const { data, error } = await supabase.functions.invoke('fetch-gmail-emails', {
        body: { 
          providerToken,
          maxResults: 100
        },
      });

      if (error || !data || data.error || !data.emails || data.emails.length === 0) {
        console.error('[Gmail Fetch] Error or no emails:', error || data?.error);
        toast.error(data?.error || 'Failed to fetch emails');
        setEmails([]);
        return;
      }

      // Group to get unique senders
      const emailsBySender = new Map<string, Email[]>();
      data.emails.forEach((email: Email) => {
        if (!emailsBySender.has(email.sender)) {
          emailsBySender.set(email.sender, [email]);
        }
      });

      const uniqueSenders = Array.from(emailsBySender.keys());
      console.log(`[Gmail Fetch] Found ${uniqueSenders.length} unique senders`);

      toast.info(`Loading details for ${uniqueSenders.length} senders...`, { duration: 2000 });

      // For each sender, fetch 5 emails + real count
      const senderPromises = uniqueSenders.map(async (sender) => {
        try {
          // Extract email from sender string
          const emailMatch = sender.match(/<(.+)>/);
          const senderEmail = emailMatch ? emailMatch[1] : sender;

          // Fetch first 5 emails for this sender
          const { data: senderData, error: senderError } = await supabase.functions.invoke('fetch-sender-emails', {
            body: {
              providerToken,
              sender: senderEmail,
              maxResults: 5,
              pageToken: null,
            },
          });

          if (senderError || !senderData) {
            console.error(`Error fetching emails for ${sender}:`, senderError);
            return null;
          }

          // Fetch full email details
          const messageDetails = await Promise.all(
            (senderData.messages || []).map(async (msg: { id: string }) => {
              const detailUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`;
              const response = await fetch(detailUrl, {
                headers: { 'Authorization': `Bearer ${providerToken}` },
              });
              return response.json();
            })
          );

          // Process messages into Email objects
          const processedEmails: Email[] = messageDetails.map((msg: any) => {
            const payload = msg.payload || {};
            const headers = collectAllHeaders(payload);

            const fromHeader = headers.find((h: any) => h.name.toLowerCase() === 'from');
            const subjectHeader = headers.find((h: any) => h.name.toLowerCase() === 'subject');
            const dateHeader = headers.find((h: any) => h.name.toLowerCase() === 'date');
            const unsubHeader = headers.find((h: any) => h.name.toLowerCase() === 'list-unsubscribe');

            const senderValue = fromHeader?.value || 'Unknown';
            const rawSubject = (subjectHeader?.value || '').trim();
            const snippet = msg.snippet || '';

            let subject = rawSubject;
            if (!subject) {
              const decodedBody = payload.body?.data ? decodeBase64Utf8(payload.body.data) : '';
              const bodyFirstLine = decodedBody.split('\n').find((line) => line.trim().length > 0) || '';
              const cleanedSnippet = cleanEmailSnippet(snippet);
              const fallback = cleanEmailSnippet(bodyFirstLine) || cleanedSnippet;
              subject = fallback || cleanedSnippet || 'No subject';
            }
            
            // Detect newsletter based on sender/subject
            const newsletterPlatforms = ['substack', 'beehiiv', 'convertkit', 'mailchimp', 'buttondown', 'ghost.io', 'revue'];
            const senderLower = senderValue.toLowerCase();
            const subjectLower = subject.toLowerCase();
            const isNewsletter = newsletterPlatforms.some(platform => senderLower.includes(platform)) ||
                                 (subjectLower.includes('newsletter') || subjectLower.includes('digest'));

            return {
              id: msg.id,
              sender: senderValue,
              subject,
              snippet,
              action: null,
              date: dateHeader?.value,
              unsubscribeUrl: unsubHeader?.value || null,
              isNewsletter,
            };
          });

          // Get exact inbox count for this sender
          const { data: countData, error: countError } = await supabase.functions.invoke('fetch-sender-emails', {
            body: {
              providerToken,
              sender: senderEmail,
              countOnly: true,
            },
          });

          if (countError) {
            console.error(`[Count] Error for ${senderEmail}:`, countError);
          }

          const realCount = countData?.totalCount ?? senderData.totalCount ?? processedEmails.length;

          return {
            sender,
            emails: processedEmails,
            totalCount: realCount,
            nextPageToken: senderData.nextPageToken || null,
          };
        } catch (error) {
          console.error(`Error processing sender ${sender}:`, error);
          return null;
        }
      });

      // Wait for all senders to be processed (with small delays to avoid rate limits)
      const senderResults = [];
      for (let i = 0; i < senderPromises.length; i++) {
        const result = await senderPromises[i];
        if (result) {
          senderResults.push(result);
        }
        
        // Add delay every 5 requests to avoid rate limits
        if (i > 0 && i % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      // Build senderState and emails array
      const initialSenderState: Record<string, SenderLoadState> = {};
      const allEmails: Email[] = [];

      senderResults.forEach(({ sender, emails, totalCount, nextPageToken }) => {
        initialSenderState[sender] = {
          emails,
          totalCount,
          nextPageToken,
          fullyLoaded: !nextPageToken || emails.length >= 100,
        };
        allEmails.push(...emails);
      });

      setSenderState(initialSenderState);
      setEmails(allEmails);

      console.log('[Gmail Fetch] Successfully loaded emails with accurate counts');
      toast.success(`Loaded emails from ${senderResults.length} senders`);

    } catch (error) {
      console.error('[Gmail Fetch] Unexpected error:', error);
      toast.error('Failed to load Gmail emails: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setEmails([]);
    } finally {
      setIsLoadingEmails(false);
    }
  };

  // Helper function to detect newsletter emails (Substack, Beehiiv, ConvertKit, etc.)
  const isNewsletterEmail = (email: Email): boolean => {
    // Use the isNewsletter field from the backend if available
    if ('isNewsletter' in email && email.isNewsletter !== undefined) {
      return email.isNewsletter;
    }
    
    // Fallback to legacy detection if field not present
    const newsletterPlatforms = ['substack', 'beehiiv', 'convertkit', 'mailchimp', 'buttondown', 'ghost.io', 'revue'];
    const senderLower = email.sender.toLowerCase();
    const subjectLower = email.subject.toLowerCase();
    
    return newsletterPlatforms.some(platform => senderLower.includes(platform)) ||
           (subjectLower.includes('newsletter') || subjectLower.includes('digest'));
  };

  // Helper function to detect subscription emails (automated/recurring)
  const isSubscriptionEmail = (email: Email): boolean => {
    const subscriptionKeywords = ['subscription', 'weekly', 'monthly', 'daily', 'unsubscribe', 'update'];
    const senderLower = email.sender.toLowerCase();
    const subjectLower = email.subject.toLowerCase();
    
    return !!email.unsubscribeUrl || 
           subscriptionKeywords.some(keyword => 
             senderLower.includes(keyword) || subjectLower.includes(keyword)
           );
  };

  // Helper function to detect marketing emails (promotional/brand)
  const isMarketingEmail = (email: Email): boolean => {
    const marketingBrands = ['shopify', 'notion', 'slack', 'figma', 'canva', 'adobe', 'zoom', 'asana', 'trello', 'salesforce'];
    const marketingKeywords = ['sale', 'offer', 'discount', 'promo', 'deal', 'limited time', 'special offer', 'new feature', 'upgrade', 'announcement'];
    const senderLower = email.sender.toLowerCase();
    const subjectLower = email.subject.toLowerCase();
    
    return marketingBrands.some(brand => senderLower.includes(brand)) ||
           marketingKeywords.some(keyword => subjectLower.includes(keyword));
  };

// Filter emails based on selected tab and date range
const getFilteredEmails = () => {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // First filter by tab
  let filtered = emails;
  switch (filterTab) {
    case "all-senders":
      filtered = emails;
      break;
    case "subscriptions":
      filtered = emails.filter(isSubscriptionEmail);
      break;
    case "newsletters":
      filtered = emails.filter(isNewsletterEmail);
      break;
    case "marketing":
      filtered = emails.filter(isMarketingEmail);
      break;
    case "most-frequent":
      filtered = emails;
      break;
    default:
      filtered = emails;
  }

  // Then apply date range filter
  let result;
  switch (dateRange) {
    case "this-week":
      result = filtered.filter((email) => {
        if (!email.date) return true;
        return new Date(email.date) >= oneWeekAgo;
      });
      break;

    case "this-month":
      result = filtered.filter((email) => {
        if (!email.date) return true;
        return new Date(email.date) >= oneMonthAgo;
      });
      break;

    case "all-time":
    default:
      result = filtered;
      break;
  }

  // Preserve emailCount in filtered results
  return result.map((email) => ({
    ...email,
    emailCount: email.emailCount || 1,
  }));
};


  const filteredEmails = getFilteredEmails();

  // Group emails by sender - use senderState as source of truth when available
  const groupedEmails: Record<string, Email[]> = {};
  
  // First, populate from senderState (which has the accurate loaded emails)
  Object.entries(senderState).forEach(([sender, state]) => {
    // Filter state.emails based on current tab filters
    const filteredStateEmails = state.emails.filter(email => {
      // Apply same filters as getFilteredEmails
      switch (filterTab) {
        case "subscriptions":
          return isSubscriptionEmail(email);
        case "newsletters":
          return isNewsletterEmail(email);
        case "marketing":
          return isMarketingEmail(email);
        default:
          return true;
      }
    });

    if (filteredStateEmails.length > 0) {
      groupedEmails[sender] = filteredStateEmails;
    }
  });

let displayEmails = Object.entries(groupedEmails).map(([sender, senderEmails]) => {
  const typedEmails = senderEmails as Email[];
  const senderStateData = senderState[sender];
  const emailCount = senderStateData?.totalCount ?? typedEmails.length;
  
  return {
    sender,
    emails: typedEmails.slice(0, 5), // Always show max 5 emails in collapsed view
    emailCount: emailCount,
  };
});

  // Sort by frequency if "most-frequent" tab is selected
  if (filterTab === "most-frequent") {
    displayEmails = displayEmails.sort((a, b) => b.emailCount - a.emailCount);
  }

  // Apply pagination for "all-senders" tab
  const paginatedEmails = filterTab === "all-senders" 
    ? displayEmails.slice(0, displayLimit)
    : displayEmails;
  
  const hasMore = filterTab === "all-senders" && displayEmails.length > displayLimit;

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    setTimeout(() => {
      setDisplayLimit(prev => prev + 20);
      setIsLoadingMore(false);
    }, 300);
  };

useEffect(() => {
  const cached = loadInboxCache();
  if (cached) {
    setEmails(cached.emails);
    setSenderState(cached.senderState);
    setIsLoadingEmails(false);
    return;
  }

  fetchGmailEmails().then(() => {
    analyzeEmails();
    if (autoApplyEnabled) {
      applyLearnedPreferences();
    }
  });
}, []);

useEffect(() => {
  if (emails.length === 0) {
    setCategoryPercentages({
      entrepreneurship: 0,
      technology: 0,
      lifestyle: 0,
      fitness: 0,
      finance: 0,
      marketing: 0,
      other: 0,
    });
    clearInboxCache();
    return;
  }

  const counts = analyzeInboxPersonality(
    emails.map((email) => ({
      sender: email.sender,
      subject: email.subject,
      snippet: email.snippet,
    }))
  );
  const percentages = calculatePercentages(counts);
  setCategoryPercentages(percentages);

  saveInboxCache({
    emails,
    senderState,
    timestamp: Date.now(),
  });
}, [emails, senderState]);



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
  const previousSenderState = { ...senderState };
  const previousEmails = [...emails];

  try {
    // Get the access token
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.provider_token;

    if (!accessToken) {
      throw new Error('No access token available');
    }

    // Delete single email from Gmail
    const gmailId = id.split('-')[0]; // Extract Gmail message ID
    await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${gmailId}/trash`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    // Update both emails state and sender state
    setEmails(prev => prev.filter(e => e.id !== id));
    
    // Update sender state - remove from emails array and decrement count
    setSenderState(prev => {
      const current = prev[sender];
      if (!current) return prev;
      
      const updatedEmails = current.emails.filter(e => e.id !== id);
      const newTotalCount = Math.max(0, current.totalCount - 1);
      
      // If no emails left for this sender, remove the sender entirely
      if (newTotalCount === 0) {
        const newState = { ...prev };
        delete newState[sender];
        return newState;
      }
      
      return {
        ...prev,
        [sender]: {
          ...current,
          emails: updatedEmails,
          totalCount: newTotalCount,
        }
      };
    });

    // Show success toast with undo
    toast.success(`Email deleted`, {
      duration: 5000,
      action: {
        label: "Undo",
        onClick: () => {
          setEmails(previousEmails);
          setSenderState(previousSenderState);
          toast.info("Delete undone");
        },
      },
    });
  } catch (error) {
    console.error('Error deleting email:', error);
    // Restore previous state on error
    setEmails(previousEmails);
    setSenderState(previousSenderState);
    toast.error('Failed to delete email. Please try again.');
  }
};

const handleDeleteAllFromSender = async (sender: string) => {
  const previousEmails = [...emails];
  const previousSenderState = { ...senderState };
  
  // Extract email from sender string
  const emailMatch = sender.match(/<(.+)>/);
  const senderEmail = emailMatch ? emailMatch[1] : sender;
  
  // Optimistically remove all emails from this sender
  const updatedEmails = emails.filter(email => email.sender !== sender);
  setEmails(updatedEmails);
  
  // Update sender state
  setSenderState(prev => {
    const newState = { ...prev };
    delete newState[sender];
    return newState;
  });

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.provider_token;

    if (!accessToken) {
      throw new Error('No access token available');
    }

    toast.info(`Deleting all emails from ${sender.split('<')[0].trim()}...`, { duration: 3000 });

    // Call bulk delete edge function
    const { data, error } = await supabase.functions.invoke('delete-sender-emails', {
      body: {
        providerToken: accessToken,
        sender: senderEmail,
      },
    });

    if (error) {
      throw error;
    }

    toast.success(`Deleted ${data.deletedCount} emails from ${sender.split('<')[0].trim()}`, {
      duration: 5000,
      action: {
        label: "Undo",
        onClick: () => {
          setEmails(previousEmails);
          setSenderState(previousSenderState);
          toast.info("Delete undone");
        },
      },
    });
  } catch (error) {
    console.error('Error deleting all emails from sender:', error);
    setEmails(previousEmails);
    setSenderState(previousSenderState);
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
    const decodedBody = decodeBase64Utf8(bodyPart.body.data);

// 🧹 Clean decoded body to remove links, HTML tags, and weird characters
let cleanedBody = decodedBody
  // Remove long URLs (tracking or redirect links)
  .replace(/https?:\/\/[^\s<>()]+/g, "")
  // Remove HTML tags
  .replace(/<\/?[^>]+(>|$)/g, "")
  // Remove weird UTF-8 artifacts like â
  .replace(/[^\x00-\x7F]/g, " ")
  // Normalize whitespace
  .replace(/\s+/g, " ")
  .trim();

    
  // DEBUG: Log the decoded body to see what we're working with
  console.log('[Unsubscribe Debug] Email body length:', decodedBody.length);
  console.log('[Unsubscribe Debug] Searching for unsubscribe links...');
  console.log('[Unsubscribe Debug] Body preview:', decodedBody.substring(0, 500));
        
// UNIVERSAL UNSUBSCRIBE DETECTOR
const linkRegex = /https?:\/\/[^\s"'<>]+/gi;
const allLinks = cleanedBody.match(linkRegex) || [];

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

  // Helper: filter out system or transactional emails
const SYSTEM_DOMAINS = [
  "google.com", "gmail.com", "paypal.com", "amazon.com", "apple.com",
  "microsoft.com", "github.com", "linkedin.com", "facebook.com", "x.com",
  "twitter.com", "instagram.com", "bankofamerica.com", "chase.com",
  "wellsfargo.com", "stripe.com", "notion.so", "openai.com",
  "supabase.io", "vercel.com"
];

const SYSTEM_KEYWORDS = [
  "security alert", "password", "verification code", "two-factor",
  "receipt", "invoice", "payment", "order confirmation",
  "purchase", "login", "notification", "access granted"
];

const isSystemEmail = (email: any) => {
  const senderDomain = email.sender?.split("@")[1]?.toLowerCase() || "";
  const subject = email.subject?.toLowerCase() || "";
  return (
    SYSTEM_DOMAINS.some((d) => senderDomain.includes(d)) ||
    SYSTEM_KEYWORDS.some((k) => subject.includes(k))
  );
};

  
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

      {/* Inbox Personality Section */}
      <div className="mb-6 bg-card rounded-lg border border-border p-6 shadow-sm">
        {/* Mascot Header */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
         <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
  <img 
    src="/cleany-inbox-logo-nobackground.png" 
    alt="Cleany clean and organize gmail inbox" 
    className="w-8 h-8 object-contain"
  />
</div>

          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              Inbox Personality
            </h2>
            <p className="text-sm text-muted-foreground">
              Meet Cleany, your inbox guide
            </p>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="space-y-3 mb-6">
          {Object.entries(categoryPercentages)
            .sort(([, a], [, b]) => b - a)
            .filter(([, percentage]) => percentage > 0)
            .map(([category, percentage]) => (
              <div key={category} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium capitalize">{category}</span>
                  <span className="text-muted-foreground font-semibold">{percentage}%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-primary to-primary/80 h-full rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            ))}
        </div>
        
        {/* Discover Button */}
        <Button
          onClick={generatePersonalitySummary}
          disabled={isGeneratingSummary || emails.length === 0}
          className="w-full mb-4"
          variant="default"
        >
          {isGeneratingSummary ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Discovering your personality...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Discover Your Inbox Personality
            </>
          )}
        </Button>

        {/* AI Summary Card */}
        {personalitySummary && (
          <div className="bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border-2 border-primary/30 rounded-lg p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 text-6xl opacity-10">✨</div>
            <div className="relative">
              <div className="flex items-start gap-3 mb-3">
                 <div className="flex items-center justify-center flex-shrink-0 overflow-hidden">
  <img 
    src="/cleany-inbox-logo-nobackground.png" 
    alt="Cleany mascot" 
    className="w-6 h-6 object-contain"
  />
</div>


                <div className="flex-1">
                  <p className="font-semibold text-sm text-primary mb-1">Cleany says:</p>
                  <p className="text-sm leading-relaxed text-foreground">{personalitySummary}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {emails.length === 0 && (
          <p className="text-sm text-muted-foreground text-center mt-4 italic">
            Load your emails to discover your inbox personality! 🎉
          </p>
        )}
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-end mb-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Date range:</span>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[140px] h-9 bg-background border-input">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border-border z-50">
                <SelectItem value="all-time">All Time</SelectItem>
                <SelectItem value="this-week">This Week</SelectItem>
                <SelectItem value="this-month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <Tabs value={filterTab} onValueChange={(value) => {
          setFilterTab(value);
          setDisplayLimit(20);
        }}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all-senders">All Senders</TabsTrigger>
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
            <TabsTrigger value="newsletters">Newsletters</TabsTrigger>
            <TabsTrigger value="marketing">Marketing</TabsTrigger>
            <TabsTrigger value="most-frequent">Most Frequent</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isLoadingEmails ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading your Gmail emails...</p>
        </div>
      ) : (
        <div className="space-y-3 mb-8">
          {paginatedEmails.map((group) => {
            const firstEmail = group.emails[0];
            const hideUnsubscribe = isSystemEmail(firstEmail);
            return (
              <EmailCard
                key={group.sender}
                emails={group.emails as Email[]}
                sender={group.sender}
                onActionChange={handleActionChange}
                onDelete={handleImmediateDelete}
                onDeleteAll={handleDeleteAllFromSender}
                onUnsubscribe={handleImmediateUnsubscribe}
                onLoadMore={loadMoreEmails}
                emailCount={group.emailCount}
                isProcessing={processingEmailId === firstEmail.id}
                isLoadingMore={loadingMoreSender === group.sender}
                hideUnsubscribe={hideUnsubscribe}
                senderLoadState={senderState[group.sender]}
              />
            );
          })}
          
          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                variant="outline"
                size="lg"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  `Load More (${displayEmails.length - displayLimit} remaining)`
                )}
              </Button>
            </div>
          )}
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

      {paginatedEmails.length > 0 && (
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
