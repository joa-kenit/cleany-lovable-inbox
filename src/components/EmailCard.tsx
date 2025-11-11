import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, UserX, Check, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Email, EmailAction } from "./EmailList";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface EmailCardProps {
  emails: Email[];
  sender: string;
  onActionChange: (id: string, action: EmailAction) => void;
  onDelete?: (id: string, sender: string) => void;
  onUnsubscribe?: (id: string, sender: string) => void;
  emailCount: number;
  isProcessing?: boolean;
  hideUnsubscribe?: boolean;
}

// Helper function to format time ago
const getTimeAgo = (dateString?: string): string => {
  if (!dateString) return "Recently";
  
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) return "Today";
  if (diffInDays === 1) return "1 day ago";
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7);
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
  }
  const months = Math.floor(diffInDays / 30);
  return `${months} ${months === 1 ? 'month' : 'months'} ago`;
};

export const EmailCard = ({ 
  emails, 
  sender, 
  onActionChange, 
  onDelete, 
  onUnsubscribe, 
  emailCount, 
  isProcessing, 
  hideUnsubscribe 
}: EmailCardProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const firstEmail = emails[0];
  const latestEmails = emails.slice(0, 5); // Show only latest 5

  const currentAction = firstEmail.action;
  
  const getActionButton = (action: EmailAction) => {
    const isSelected = currentAction === action;
    
    const variants = {
      delete: {
        icon: isSelected ? Check : Trash2,
        className: cn(
          "border-2 transition-all",
          isSelected
            ? "bg-destructive text-destructive-foreground border-destructive shadow-md"
            : "border-destructive/20 text-destructive hover:bg-destructive/10"
        ),
        label: "Delete",
      },
      unsubscribe: {
        icon: isSelected ? Check : UserX,
        className: cn(
          "border-2 transition-all",
          isSelected
            ? "bg-warning text-warning-foreground border-warning shadow-md"
            : "border-warning/20 text-warning hover:bg-warning/10"
        ),
        label: "Unsubscribe",
      },
    };

    if (!action || action === 'keep') return null;

    const config = variants[action];
    const Icon = config.icon;
    const showLoader = isProcessing && action === 'unsubscribe';

    return (
      <Button
        variant="outline"
        size="sm"
        className={config.className}
        onClick={() => {
          if (action === 'delete' && onDelete) {
            onDelete(firstEmail.id, sender);
          } else if (action === 'unsubscribe' && onUnsubscribe) {
            onUnsubscribe(firstEmail.id, sender);
          } else {
            onActionChange(firstEmail.id, isSelected ? null : action);
          }
        }}
        disabled={isProcessing}
      >
        {showLoader ? (
          <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
        ) : (
          <Icon className="h-4 w-4 mr-1.5" />
        )}
        {config.label}
      </Button>
    );
  };

  return (
    <div
      className={cn(
        "bg-card border rounded-lg shadow-sm hover:shadow-md transition-all",
        currentAction && "ring-2 ring-primary/20"
      )}
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="p-4">
          <div className="flex items-start justify-between gap-4">
            {/* Sender Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-base truncate">{sender.split('<')[0].trim()}</h3>
                <Badge variant="secondary" className="text-xs shrink-0">
                  {emailCount} {emailCount === 1 ? 'email' : 'emails'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {sender.includes('<') ? sender.match(/<(.+)>/)?.[1] : sender}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 shrink-0">
              {getActionButton("delete")}
              {!hideUnsubscribe && getActionButton("unsubscribe")}
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 p-0"
                >
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </div>

        {/* Expandable Email List */}
        <CollapsibleContent>
          <div className="border-t bg-muted/30">
            <div className="divide-y divide-border/50">
              {latestEmails.map((email, index) => (
                <div 
                  key={email.id} 
                  className="px-4 py-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-xs text-muted-foreground shrink-0 min-w-[80px]">
                      {getTimeAgo(email.date)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate mb-0.5">
                        {email.subject}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {email.snippet}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {emails.length > 5 && (
              <div className="px-4 py-2 text-center text-xs text-muted-foreground border-t">
                +{emails.length - 5} more emails
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
