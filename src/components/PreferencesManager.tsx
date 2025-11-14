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

return null;
};


      
