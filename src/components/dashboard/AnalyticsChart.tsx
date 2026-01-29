import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EmailAnalytics } from '@/types/database';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays } from 'date-fns';

export function AnalyticsChart() {
  const [analytics, setAnalytics] = useState<EmailAnalytics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    const rangeStart = subDays(new Date(), 365).toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('email_analytics')
      .select('*')
      .gte('date', rangeStart)
      .order('date', { ascending: true });

    if (!error && data) {
      setAnalytics(data as EmailAnalytics[]);
    }
    setLoading(false);
  };

  const chartData = analytics.map((item) => ({
    date: format(new Date(item.date), 'MMM d'),
    drafts: item.total_drafts_created,
    approved: item.total_drafts_approved,
    sent: item.total_emails_sent,
    opened: item.total_emails_opened || 0,
    replies: item.total_replies_received || 0,
  }));

  if (loading) {
    return (
      <div className="rounded-xl bg-card border border-border p-6 h-80">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-secondary rounded w-1/4" />
          <div className="h-60 bg-secondary rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-card border border-border p-6">
      <h3 className="text-lg font-semibold font-serif mb-4 text-foreground">Email Activity (Last 12 Months)</h3>
      
      {chartData.length === 0 ? (
        <div className="h-60 flex items-center justify-center text-muted-foreground">
          <p>No analytics data yet. Start sending emails to see activity.</p>
        </div>
      ) : (
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(45 100% 50%)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(45 100% 50%)" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorApproved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(45 80% 45%)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(45 80% 45%)" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorOpened" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(200 90% 55%)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(200 90% 55%)" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorReplies" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(140 60% 45%)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(140 60% 45%)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 20%)" />
              <XAxis 
                dataKey="date" 
                stroke="hsl(0 0% 50%)"
                fontSize={12}
                tickLine={false}
              />
              <YAxis 
                stroke="hsl(0 0% 50%)"
                fontSize={12}
                tickLine={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(0 0% 8%)',
                  border: '1px solid hsl(45 30% 20%)',
                  borderRadius: '8px',
                  color: 'hsl(45 100% 95%)'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="sent" 
                stroke="hsl(45 100% 50%)" 
                fillOpacity={1} 
                fill="url(#colorSent)" 
                strokeWidth={2}
                name="Emails Sent"
              />
              <Area 
                type="monotone" 
                dataKey="approved" 
                stroke="hsl(45 80% 45%)" 
                fillOpacity={1} 
                fill="url(#colorApproved)" 
                strokeWidth={2}
                name="Drafts Approved"
              />
              <Area 
                type="monotone" 
                dataKey="opened" 
                stroke="hsl(200 90% 55%)" 
                fillOpacity={1} 
                fill="url(#colorOpened)" 
                strokeWidth={2}
                name="Emails Opened"
              />
              <Area 
                type="monotone" 
                dataKey="replies" 
                stroke="hsl(140 60% 45%)" 
                fillOpacity={1} 
                fill="url(#colorReplies)" 
                strokeWidth={2}
                name="Replies"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
