import { Button } from "@/components/ui/button";
import { Mail, Trash2, UserX, Check } from "lucide-react";
import { Email, EmailAction } from "./EmailList";
import { cn } from "@/lib/utils";

interface EmailCardProps {
  email: Email;
  onActionChange: (id: string, action: EmailAction) => void;
}

export const EmailCard = ({ email, onActionChange }: EmailCardProps) => {
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

    return (
      <Button
        variant="outline"
        size="sm"
        className={config.className}
        onClick={() => onActionChange(email.id, isSelected ? null : action)}
      >
        <Icon className="h-4 w-4 mr-1.5" />
        {config.label}
      </Button>
    );
  };

  return (
    <div
      className={cn(
        "bg-card border rounded-xl p-4 shadow-sm hover:shadow-md transition-all",
        email.action && "ring-2 ring-primary/20"
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-muted-foreground mb-1 truncate">
            {email.sender}
          </div>
          <h3 className="font-semibold mb-1 truncate">{email.subject}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {email.snippet}
          </p>
        </div>

        <div className="flex sm:flex-col gap-2 flex-wrap sm:flex-nowrap">
          {getActionButton("keep", email.action)}
          {getActionButton("delete", email.action)}
          {getActionButton("unsubscribe", email.action)}
        </div>
      </div>
    </div>
  );
};
