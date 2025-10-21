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
import { Loader2 } from "lucide-react";

interface CleanInboxDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deleteCount: number;
  unsubscribeCount: number;
  onConfirm: () => void;
  isProcessing: boolean;
}

export const CleanInboxDialog = ({
  open,
  onOpenChange,
  deleteCount,
  unsubscribeCount,
  onConfirm,
  isProcessing,
}: CleanInboxDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Clean Inbox</AlertDialogTitle>
          <AlertDialogDescription>
            This will process {deleteCount + unsubscribeCount} email{deleteCount + unsubscribeCount !== 1 ? 's' : ''} based on AI suggestions:
            <div className="mt-4 space-y-2">
              {deleteCount > 0 && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">Delete:</span>
                  <span>{deleteCount} sender{deleteCount !== 1 ? 's' : ''}</span>
                </div>
              )}
              {unsubscribeCount > 0 && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">Unsubscribe:</span>
                  <span>{unsubscribeCount} sender{unsubscribeCount !== 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
            <p className="mt-4">Do you want to continue?</p>
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
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Continue"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
