import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Brain, Trash2, Mail, UserX, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Preference {
  id: string;
  sender_pattern: string;
  preferred_action: 'keep' | 'delete' | 'unsubscribe';
  confidence_score: number;
  action_count: number;
}

export const PreferencesManager = () => {
  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .order('confidence_score', { ascending: false })
        .limit(10);

      if (error) throw error;
      setPreferences((data || []) as Preference[]);
    } catch (error) {
      console.error('Failed to fetch preferences:', error);
      toast.error('Failed to load preferences');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePreference = async (id: string) => {
    try {
      const { error } = await supabase
        .from('user_preferences')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setPreferences(preferences.filter(p => p.id !== id));
      toast.success('Preference removed');
    } catch (error) {
      console.error('Failed to delete preference:', error);
      toast.error('Failed to remove preference');
    }
  };

  const handleResetAll = async () => {
    try {
      const { error } = await supabase
        .from('user_preferences')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (error) throw error;

      setPreferences([]);
      toast.success('All preferences reset');
    } catch (error) {
      console.error('Failed to reset preferences:', error);
      toast.error('Failed to reset preferences');
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'keep':
        return <Mail className="h-4 w-4 text-success" />;
      case 'delete':
        return <Trash2 className="h-4 w-4 text-destructive" />;
      case 'unsubscribe':
        return <UserX className="h-4 w-4 text-warning" />;
      default:
        return null;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'keep':
        return 'bg-success/10 text-success border-success/20';
      case 'delete':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'unsubscribe':
        return 'bg-warning/10 text-warning border-warning/20';
      default:
        return '';
    }
  };

  if (isLoading) {
    return null;
  }

  return <></>;


      {preferences.length === 0 ? (
        <div className="text-center py-8">
          <Brain className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground">
            No preferences learned yet. Clean some emails to help the AI learn your patterns!
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {preferences.map((pref) => (
            <div
              key={pref.id}
              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {getActionIcon(pref.preferred_action)}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{pref.sender_pattern}</div>
                  <div className="text-xs text-muted-foreground">
                    {pref.action_count} {pref.action_count === 1 ? 'action' : 'actions'} tracked
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className={getActionColor(pref.preferred_action)}>
                    {pref.preferred_action}
                  </Badge>
                  <Badge variant="outline">
                    {Math.round(pref.confidence_score * 100)}% confident
                  </Badge>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeletePreference(pref.id)}
                className="ml-2"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
        <p className="text-sm text-muted-foreground">
          <strong>How it works:</strong> The AI learns from your actions and automatically suggests
          future emails to keep, delete, or unsubscribe based on sender patterns. Higher confidence
          means more consistent actions.
        </p>
      </div>
    </Card>
  );
};
