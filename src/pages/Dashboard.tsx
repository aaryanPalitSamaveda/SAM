import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { AnalyticsChart } from '@/components/dashboard/AnalyticsChart';
import { CoreAnalytics } from '@/components/dashboard/CoreAnalytics';
import { supabase } from '@/integrations/supabase/client';
import { Mail, FileText, Send, Users, Clock, TrendingUp, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface DashboardStats {
  totalContacts: number;
  totalDrafts: number;
  pendingApproval: number;
  totalSent: number;
  totalOpened: number;
  totalReplies: number;
  scheduledEmails: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalContacts: 0,
    totalDrafts: 0,
    pendingApproval: 0,
    totalSent: 0,
    totalOpened: 0,
    totalReplies: 0,
    scheduledEmails: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const [contactsRes, draftsRes, pendingRes, sentRes, openedRes, repliesRes, scheduledRes] = await Promise.all([
        supabase.from('contacts').select('id', { count: 'exact', head: true }),
        supabase.from('email_drafts').select('id', { count: 'exact', head: true }),
        supabase.from('email_drafts').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
        supabase.from('sent_emails').select('id', { count: 'exact', head: true }),
        supabase.from('email_opens' as any).select('sent_email_id'),
        supabase.from('email_replies' as any).select('message_id').not('sent_email_id', 'is', null),
        supabase.from('scheduled_emails').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);

      const uniqueOpenedEmails = new Set(
        (openedRes?.data || [])
          .map((row: any) => row?.sent_email_id)
          .filter(Boolean)
      );

      const uniqueReplies = new Set(
        (repliesRes?.data || [])
          .map((row: any) => row?.message_id)
          .filter(Boolean)
      );

      setStats({
        totalContacts: contactsRes.count || 0,
        totalDrafts: draftsRes.count || 0,
        pendingApproval: pendingRes.count || 0,
        totalSent: sentRes.count || 0,
        totalOpened: uniqueOpenedEmails.size,
        totalReplies: uniqueReplies.size,
        scheduledEmails: scheduledRes.count || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground text-sm">
              Monitor outreach activity and engagement
            </p>
          </div>
          <Link to="/analytics">
            <Button variant="outline" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              View Analytics
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
          <StatsCard
            title="Total Contacts"
            value={loading ? '—' : stats.totalContacts}
            icon={<Users className="w-5 h-5 text-primary" />}
          />
          <StatsCard
            title="Total Drafts"
            value={loading ? '—' : stats.totalDrafts}
            icon={<FileText className="w-5 h-5 text-primary" />}
          />
          <StatsCard
            title="Pending Approval"
            value={loading ? '—' : stats.pendingApproval}
            icon={<Mail className="w-5 h-5 text-primary" />}
          />
          <StatsCard
            title="Emails Sent"
            value={loading ? '—' : stats.totalSent}
            icon={<Send className="w-5 h-5 text-primary" />}
          />
          <StatsCard
            title="Emails Opened"
            value={loading ? '—' : stats.totalOpened}
            icon={<Mail className="w-5 h-5 text-primary" />}
          />
          <StatsCard
            title="Replies"
            value={loading ? '—' : stats.totalReplies}
            icon={<TrendingUp className="w-5 h-5 text-primary" />}
          />
          <StatsCard
            title="Scheduled"
            value={loading ? '—' : stats.scheduledEmails}
            icon={<Clock className="w-5 h-5 text-primary" />}
          />
        </div>

        {/* Charts and Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-4">
            <AnalyticsChart />
            <CoreAnalytics />
          </div>
          <div>
            <RecentActivity />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
