import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle } from "lucide-react";

interface UnsubscribeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  emailCount: number;
  onConfirm: () => void;
  isProcessing: boolean;
}

export const UnsubscribeDialog = ({
  open,
  onOpenChange,
  emailCount,
  onConfirm,
  isProcessing,
}: UnsubscribeDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Confirm Unsubscribe
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <p>
              You are about to unsubscribe from{" "}
              <Badge variant="secondary" className="font-semibold">
                {emailCount} {emailCount === 1 ? "email" : "emails"}
              </Badge>
            </p>
            <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-sm">
              <p className="font-medium text-foreground">What will happen:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>We'll detect unsubscribe links in marked emails</li>
                <li>Unsubscribe requests will be sent automatically</li>
                <li>Requests are spaced out to avoid errors</li>
                <li>You'll see a summary when complete</li>
              </ul>
            </div>
            <p className="text-sm text-muted-foreground">
              This action cannot be undone. You may need to manually resubscribe if needed.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isProcessing}
            className="bg-warning text-warning-foreground hover:bg-warning/90"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Confirm Unsubscribe"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
