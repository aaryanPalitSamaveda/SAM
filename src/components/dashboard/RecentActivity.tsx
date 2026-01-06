import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SentEmail } from '@/types/database';
import { Mail, Clock, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function RecentActivity() {
  const [recentEmails, setRecentEmails] = useState<SentEmail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentEmails();
  }, []);

  const fetchRecentEmails = async () => {
    const { data, error } = await supabase
      .from('sent_emails')
      .select(`
        *,
        contact:contacts(name, email, company),
        sender_account:sender_accounts(email, display_name)
      `)
      .order('sent_at', { ascending: false })
      .limit(5);

    if (!error && data) {
      setRecentEmails(data as unknown as SentEmail[]);
    }
    setLoading(false);
  };

  const getDraftTypeLabel = (type: string) => {
    switch (type) {
      case 'first_outreach': return '1st Outreach';
      case 'second_followup': return '2nd Follow-up';
      case 'final_followup': return 'Final Follow-up';
      default: return type;
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg bg-card border border-border p-6">
        <h3 className="text-lg font-semibold font-serif mb-4 text-foreground">Recent Activity</h3>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse flex gap-4">
              <div className="w-10 h-10 bg-muted rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-card border border-border p-6 h-full">
      <h3 className="text-lg font-semibold font-serif mb-4 text-foreground">Recent Activity</h3>
      
      {recentEmails.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Mail className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No emails sent yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {recentEmails.map((email) => (
            <div 
              key={email.id} 
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors border border-transparent hover:border-border"
            >
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/10">
                <CheckCircle className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm truncate">
                  {(email.contact as any)?.name || email.recipient_email}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {getDraftTypeLabel(email.draft_type)} • {(email.contact as any)?.company || 'Unknown'}
                </p>
                <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {formatDistanceToNow(new Date(email.sent_at), { addSuffix: true })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
