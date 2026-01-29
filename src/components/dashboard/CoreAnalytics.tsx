import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { subDays, format } from 'date-fns';

type SentEmailRow = {
  id: string;
  draft_type: string;
  sender_account_id: string | null;
  sent_at: string;
};

type OpenRow = {
  sent_email_id: string;
  opened_at: string;
};

type ReplyRow = {
  sent_email_id: string | null;
  received_at: string | null;
  created_at?: string | null;
};

type SenderAccountRow = {
  id: string;
  email: string;
  display_name: string | null;
};

const draftTypeLabel = (type: string) => {
  switch (type) {
    case 'first_outreach':
      return '1st';
    case 'second_followup':
      return '2nd';
    case 'final_followup':
      return 'Final';
    default:
      return type;
  }
};

type BarShapeProps = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fill?: string;
};

const LiftedBar = ({ x = 0, y = 0, width = 0, height = 0, fill = '#fff' }: BarShapeProps) => (
  <g transform="translate(0,-3)">
    <rect
      x={x}
      y={y}
      width={Math.max(width, 0)}
      height={Math.max(height, 0)}
      rx={6}
      ry={6}
      fill={fill}
      filter="url(#barLift)"
    />
  </g>
);

export function CoreAnalytics() {
  const [sentEmails, setSentEmails] = useState<SentEmailRow[]>([]);
  const [opens, setOpens] = useState<OpenRow[]>([]);
  const [replies, setReplies] = useState<ReplyRow[]>([]);
  const [senders, setSenders] = useState<SenderAccountRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    const rangeStart = subDays(new Date(), 30).toISOString();

    const [sentRes, opensRes, repliesRes, sendersRes] = await Promise.all([
      supabase
        .from('sent_emails')
        .select('id,draft_type,sender_account_id,sent_at')
        .gte('sent_at', rangeStart),
      supabase
        .from('email_opens' as any)
        .select('sent_email_id,opened_at')
        .gte('opened_at', rangeStart),
      supabase
        .from('email_replies' as any)
        .select('sent_email_id,received_at,created_at')
        .gte('received_at', rangeStart),
      supabase.from('sender_accounts').select('id,email,display_name'),
    ]);

    if (!sentRes.error && sentRes.data) setSentEmails(sentRes.data as SentEmailRow[]);
    if (!opensRes.error && opensRes.data) setOpens(opensRes.data as OpenRow[]);
    if (!repliesRes.error && repliesRes.data) setReplies(repliesRes.data as ReplyRow[]);
    if (!sendersRes.error && sendersRes.data) setSenders(sendersRes.data as SenderAccountRow[]);

    setLoading(false);
  };

  const { funnelData, bySequence, bySender } = useMemo(() => {
    const sentIdToType = new Map<string, string>();
    const sentIdToSender = new Map<string, string>();
    sentEmails.forEach((email) => {
      sentIdToType.set(email.id, email.draft_type);
      if (email.sender_account_id) sentIdToSender.set(email.id, email.sender_account_id);
    });

    const openedSentIds = new Set(
      opens.map((open) => open.sent_email_id).filter((id) => sentIdToType.has(id))
    );
    const repliedSentIds = new Set(
      replies
        .map((reply) => reply.sent_email_id)
        .filter((id): id is string => Boolean(id && sentIdToType.has(id)))
    );

    const funnel = [
      { stage: 'Sent', count: sentEmails.length },
      { stage: 'Opened', count: openedSentIds.size },
      { stage: 'Replied', count: repliedSentIds.size },
    ];

    const sequenceMap = new Map<string, { sent: number; opened: number; replied: number }>();
    sentEmails.forEach((email) => {
      const key = draftTypeLabel(email.draft_type);
      const current = sequenceMap.get(key) || { sent: 0, opened: 0, replied: 0 };
      current.sent += 1;
      sequenceMap.set(key, current);
    });
    openedSentIds.forEach((id) => {
      const type = sentIdToType.get(id);
      if (!type) return;
      const key = draftTypeLabel(type);
      const current = sequenceMap.get(key) || { sent: 0, opened: 0, replied: 0 };
      current.opened += 1;
      sequenceMap.set(key, current);
    });
    repliedSentIds.forEach((id) => {
      const type = sentIdToType.get(id);
      if (!type) return;
      const key = draftTypeLabel(type);
      const current = sequenceMap.get(key) || { sent: 0, opened: 0, replied: 0 };
      current.replied += 1;
      sequenceMap.set(key, current);
    });

    const sequenceData = Array.from(sequenceMap.entries()).map(([type, stats]) => ({
      type,
      ...stats,
    }));

    const senderName = new Map(
      senders.map((sender) => [sender.id, sender.display_name || sender.email])
    );

    const senderMap = new Map<string, { sent: number; opened: number; replied: number }>();
    sentEmails.forEach((email) => {
      if (!email.sender_account_id) return;
      const key = email.sender_account_id;
      const current = senderMap.get(key) || { sent: 0, opened: 0, replied: 0 };
      current.sent += 1;
      senderMap.set(key, current);
    });
    openedSentIds.forEach((id) => {
      const senderId = sentIdToSender.get(id);
      if (!senderId) return;
      const current = senderMap.get(senderId) || { sent: 0, opened: 0, replied: 0 };
      current.opened += 1;
      senderMap.set(senderId, current);
    });
    repliedSentIds.forEach((id) => {
      const senderId = sentIdToSender.get(id);
      if (!senderId) return;
      const current = senderMap.get(senderId) || { sent: 0, opened: 0, replied: 0 };
      current.replied += 1;
      senderMap.set(senderId, current);
    });

    const senderData = Array.from(senderMap.entries())
      .map(([senderId, stats]) => {
        const label = senderName.get(senderId) || 'Unknown';
        const openRate = stats.sent ? Math.round((stats.opened / stats.sent) * 100) : 0;
        const replyRate = stats.sent ? Math.round((stats.replied / stats.sent) * 100) : 0;
        return {
          sender: label,
          openRate,
          replyRate,
          sent: stats.sent,
        };
      })
      .sort((a, b) => b.sent - a.sent)
      .slice(0, 8);

    return { funnelData: funnel, bySequence: sequenceData, bySender: senderData };
  }, [sentEmails, opens, replies, senders]);

  const tooltipProps = {
    contentStyle: {
      background: 'hsl(222 47% 11%)',
      border: '1px solid hsl(215 25% 27%)',
      color: 'hsl(210 40% 96%)',
      borderRadius: '10px',
      boxShadow: '0 12px 30px -18px rgba(0,0,0,0.6)',
      padding: '6px 10px',
      fontSize: '12px',
    },
    labelStyle: { color: 'hsl(210 40% 96%)' },
    cursor: { fill: 'rgba(255,255,255,0.02)' },
    wrapperStyle: { pointerEvents: 'none' as const },
    allowEscapeViewBox: { x: true, y: true },
    position: { y: 8 },
  };

  const rangeLabel = useMemo(() => {
    const start = format(subDays(new Date(), 30), 'MMM d');
    const end = format(new Date(), 'MMM d');
    return `${start} - ${end}`;
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-card border-border animate-pulse">
            <CardHeader className="pb-2">
              <CardTitle className="h-5 w-32 bg-secondary rounded" />
            </CardHeader>
            <CardContent className="h-56 bg-secondary rounded" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Core Analytics</h2>
          <p className="text-sm text-muted-foreground">Last 30 days • {rangeLabel}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Funnel</CardTitle>
          </CardHeader>
          <CardContent className="h-56 pt-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="funnelFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(45 100% 55%)" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="hsl(45 90% 40%)" stopOpacity={0.7} />
                  </linearGradient>
                  <filter id="barLift" x="-20%" y="-20%" width="140%" height="160%">
                    <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="rgba(0,0,0,0.55)" />
                  </filter>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 20%)" />
                <XAxis dataKey="stage" stroke="hsl(0 0% 50%)" tickLine={false} />
                <YAxis stroke="hsl(0 0% 50%)" tickLine={false} />
                <Tooltip {...tooltipProps} />
                <Bar
                  dataKey="count"
                  fill="url(#funnelFill)"
                  radius={[6, 6, 0, 0]}
                  barSize={32}
                  isAnimationActive
                  animationDuration={900}
                  activeBar={<LiftedBar />}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">By Sequence</CardTitle>
          </CardHeader>
          <CardContent className="h-56 pt-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bySequence} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="seqSent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(45 100% 55%)" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="hsl(45 90% 40%)" stopOpacity={0.7} />
                  </linearGradient>
                  <linearGradient id="seqOpen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(200 90% 60%)" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="hsl(200 80% 45%)" stopOpacity={0.7} />
                  </linearGradient>
                  <linearGradient id="seqReply" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(140 60% 50%)" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="hsl(140 50% 35%)" stopOpacity={0.7} />
                  </linearGradient>
                  <filter id="barLift" x="-20%" y="-20%" width="140%" height="160%">
                    <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="rgba(0,0,0,0.55)" />
                  </filter>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 20%)" />
                <XAxis dataKey="type" stroke="hsl(0 0% 50%)" tickLine={false} />
                <YAxis stroke="hsl(0 0% 50%)" tickLine={false} />
                <Tooltip {...tooltipProps} />
                <Legend />
                <Bar
                  dataKey="sent"
                  fill="url(#seqSent)"
                  radius={[6, 6, 0, 0]}
                  barSize={18}
                  isAnimationActive
                  animationDuration={900}
                  activeBar={<LiftedBar />}
                />
                <Bar
                  dataKey="opened"
                  fill="url(#seqOpen)"
                  radius={[6, 6, 0, 0]}
                  barSize={18}
                  isAnimationActive
                  animationDuration={900}
                  activeBar={<LiftedBar />}
                />
                <Bar
                  dataKey="replied"
                  fill="url(#seqReply)"
                  radius={[6, 6, 0, 0]}
                  barSize={18}
                  isAnimationActive
                  animationDuration={900}
                  activeBar={<LiftedBar />}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Sender Performance</CardTitle>
        </CardHeader>
        <CardContent className="h-56 pt-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bySender} layout="vertical" margin={{ left: 24, top: 6, right: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="senderOpen" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="hsl(200 90% 60%)" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="hsl(200 80% 45%)" stopOpacity={0.7} />
                </linearGradient>
                <linearGradient id="senderReply" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="hsl(140 60% 50%)" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="hsl(140 50% 35%)" stopOpacity={0.7} />
                </linearGradient>
                <filter id="barLift" x="-20%" y="-20%" width="140%" height="160%">
                  <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="rgba(0,0,0,0.55)" />
                </filter>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 20%)" />
              <XAxis type="number" stroke="hsl(0 0% 50%)" tickLine={false} unit="%" />
              <YAxis type="category" dataKey="sender" stroke="hsl(0 0% 50%)" tickLine={false} width={110} />
              <Tooltip {...tooltipProps} />
              <Legend />
              <Bar
                dataKey="openRate"
                name="Open Rate"
                fill="url(#senderOpen)"
                radius={[6, 6, 6, 6]}
                barSize={14}
                isAnimationActive
                animationDuration={900}
                activeBar={<LiftedBar />}
              />
              <Bar
                dataKey="replyRate"
                name="Reply Rate"
                fill="url(#senderReply)"
                radius={[6, 6, 6, 6]}
                barSize={14}
                isAnimationActive
                animationDuration={900}
                activeBar={<LiftedBar />}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
