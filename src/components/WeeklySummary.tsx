import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, TrendingUp, Mail, Trash2, UserX, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WeeklySummary {
  week_start: string;
  emails_processed: number;
  emails_kept: number;
  emails_deleted: number;
  emails_unsubscribed: number;
  auto_actions_applied: number;
}

export const WeeklySummary = () => {
  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchWeeklySummary();
  }, []);

  const fetchWeeklySummary = async () => {
    try {
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('weekly_summaries')
        .select('*')
        .eq('week_start', weekStart.toISOString().split('T')[0])
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching summary:', error);
        throw error;
      }

      setSummary(data);
    } catch (error) {
      console.error('Failed to fetch weekly summary:', error);
      toast.error('Failed to load weekly summary');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return null;
  }

  if (!summary || summary.emails_processed === 0) {
    return (
      <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <div className="flex items-center gap-3 mb-3">
          <Calendar className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">This Week's Activity</h3>
        </div>
        <p className="text-muted-foreground text-sm">
          Start cleaning your inbox to see your weekly summary here!
        </p>
      </Card>
    );
  }

  const weekStartDate = new Date(summary.week_start);
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekStartDate.getDate() + 6);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const cleanlinessScore = summary.emails_processed > 0
    ? Math.round(((summary.emails_deleted + summary.emails_unsubscribed) / summary.emails_processed) * 100)
    : 0;

  return (
    <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">This Week's Summary</h3>
        </div>
        <Badge variant="secondary" className="bg-primary/10 text-primary">
          {formatDate(weekStartDate)} - {formatDate(weekEndDate)}
        </Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-card rounded-lg p-3 border">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <Mail className="h-4 w-4" />
            Processed
          </div>
          <div className="text-2xl font-bold">{summary.emails_processed}</div>
        </div>

        <div className="bg-card rounded-lg p-3 border border-success/20">
          <div className="flex items-center gap-2 text-success text-sm mb-1">
            <Mail className="h-4 w-4" />
            Kept
          </div>
          <div className="text-2xl font-bold text-success">{summary.emails_kept}</div>
        </div>

        <div className="bg-card rounded-lg p-3 border border-destructive/20">
          <div className="flex items-center gap-2 text-destructive text-sm mb-1">
            <Trash2 className="h-4 w-4" />
            Deleted
          </div>
          <div className="text-2xl font-bold text-destructive">{summary.emails_deleted}</div>
        </div>

        <div className="bg-card rounded-lg p-3 border border-warning/20">
          <div className="flex items-center gap-2 text-warning text-sm mb-1">
            <UserX className="h-4 w-4" />
            Unsubscribed
          </div>
          <div className="text-2xl font-bold text-warning">{summary.emails_unsubscribed}</div>
        </div>
      </div>

      <div className="bg-card rounded-lg p-4 border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Cleanliness Score</span>
          </div>
          <Badge variant="secondary" className="bg-primary/10 text-primary font-bold">
            {cleanlinessScore}%
          </Badge>
        </div>
        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-primary to-primary/60 h-full transition-all duration-500"
            style={{ width: `${cleanlinessScore}%` }}
          />
        </div>
        {summary.auto_actions_applied > 0 && (
          <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            {summary.auto_actions_applied} emails auto-managed by AI
          </div>
        )}
      </div>
    </Card>
  );
};
