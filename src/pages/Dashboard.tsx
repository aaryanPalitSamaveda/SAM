import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { AnalyticsChart } from '@/components/dashboard/AnalyticsChart';
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
  }, []);

  const fetchStats = async () => {
    try {
      const [contactsRes, draftsRes, pendingRes, sentRes, openedRes, repliesRes, scheduledRes] = await Promise.all([
        supabase.from('contacts').select('id', { count: 'exact', head: true }),
        supabase.from('email_drafts').select('id', { count: 'exact', head: true }),
        supabase.from('email_drafts').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
        supabase.from('sent_emails').select('id', { count: 'exact', head: true }),
        supabase.from('email_opens' as any).select('id', { count: 'exact', head: true }),
        supabase.from('email_replies' as any).select('id', { count: 'exact', head: true }).not('sent_email_id', 'is', null),
        supabase.from('scheduled_emails').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);

      setStats({
        totalContacts: contactsRes.count || 0,
        totalDrafts: draftsRes.count || 0,
        pendingApproval: pendingRes.count || 0,
        totalSent: sentRes.count || 0,
        totalOpened: openedRes.count || 0,
        totalReplies: repliesRes.count || 0,
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
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
              Overview
            </span>
          </div>
          <div>
            <h1 className="text-3xl font-serif font-semibold text-foreground tracking-tight">
              Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Monitor your investor outreach campaigns and track engagement
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4 animate-slide-up">
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
          <div className="lg:col-span-2">
            <AnalyticsChart />
          </div>
          <div>
            <RecentActivity />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
