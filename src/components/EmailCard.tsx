import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Trash2, UserX, Check, Sparkles, Loader2 } from "lucide-react";
import { Email, EmailAction } from "./EmailList";
import { cn } from "@/lib/utils";

interface EmailCardProps {
  email: Email;
  onActionChange: (id: string, action: EmailAction) => void;
  onDelete?: (id: string, sender: string) => void;
  onUnsubscribe?: (id: string, sender: string) => void;
  emailCount?: number;
  isProcessing?: boolean;
  hideUnsubscribe?: boolean;
}
  

export const EmailCard = ({ email, onActionChange, onDelete, onUnsubscribe, emailCount, isProcessing, hideUnsubscribe }: EmailCardProps) => {
  const getActionButton = (action: EmailAction, currentAction: EmailAction) => {
    const isSelected = email.action === action;
    
    const variants = {
      keep: {
        icon: isSelected ? Check : Mail,
        className: cn(
          "border-2 transition-all",
          isSelected
            ? "bg-success text-success-foreground border-success shadow-md"
            : "border-success/20 text-success hover:bg-success/10"
        ),
        label: "Keep",
      },
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

    if (!action) return null;

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
            onDelete(email.id, email.sender);
          } else if (action === 'unsubscribe' && onUnsubscribe) {
            onUnsubscribe(email.id, email.sender);
          } else {
            onActionChange(email.id, isSelected ? null : action);
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

  const getActionLabel = (action: EmailAction) => {
    if (action === "keep") return "Keep";
    if (action === "delete") return "Delete";
    if (action === "unsubscribe") return "Unsubscribe";
    return "";
  };

  return (
    <div
      className={cn(
        "bg-card border rounded-xl p-4 shadow-sm hover:shadow-md transition-all",
        email.action && "ring-2 ring-primary/20"
      )}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="font-medium text-sm text-muted-foreground truncate">
                {email.sender}
              </div>
              {emailCount && emailCount > 1 && (
                <Badge variant="secondary" className="text-xs">
                  {emailCount} emails
                </Badge>
              )}
            </div>
            <h3 className="font-semibold mb-1 truncate">{email.subject}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {email.snippet}
            </p>
          </div>

          <div className="flex sm:flex-col gap-2 flex-wrap sm:flex-nowrap">
            {getActionButton("keep", email.action)}
            {getActionButton("delete", email.action)}
            {!hideUnsubscribe && getActionButton("unsubscribe", email.action)}
          </div>
        </div>

        {email.aiSuggestion && (
          <div className="flex items-start gap-2 bg-primary/5 border border-primary/10 rounded-lg p-3">
            <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-sm font-medium">AI suggests:</span>
                <Badge
                  variant="secondary"
                  className={cn(
                    email.aiSuggestion.action === "keep" && "bg-success/10 text-success border-success/20",
                    email.aiSuggestion.action === "delete" && "bg-destructive/10 text-destructive border-destructive/20",
                    email.aiSuggestion.action === "unsubscribe" && "bg-warning/10 text-warning border-warning/20"
                  )}
                >
                  {getActionLabel(email.aiSuggestion.action)}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {email.aiSuggestion.reason}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
