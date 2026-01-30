import { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { SentEmail, EmailOpen, EmailReply } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Clock, Search, Mail, Eye, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

interface SentEmailWithMeta extends SentEmail {
  openCount?: number;
}

export default function EmailAnalyticsDetails() {
  const [sentEmails, setSentEmails] = useState<SentEmailWithMeta[]>([]);
  const [opens, setOpens] = useState<EmailOpen[]>([]);
  const [replies, setReplies] = useState<EmailReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmail, setSelectedEmail] = useState<SentEmailWithMeta | null>(null);

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const { data: sentData } = await supabase
        .from('sent_emails')
        .select('*, contact:contacts(name, email, company), sender_account:sender_accounts(email, display_name)')
        .order('sent_at', { ascending: false })
        .limit(200);

      const { data: openData } = await supabase
        .from('email_opens' as any)
        .select('*, sent_email:sent_emails(subject, recipient_email), contact:contacts(name, email)')
        .order('opened_at', { ascending: false })
        .limit(200);

      const { data: replyData } = await supabase
        .from('email_replies' as any)
        .select('*, contact:contacts(name, email, company), sent_email:sent_emails(subject, recipient_email)')
        .not('sent_email_id', 'is', null)
        .order('received_at', { ascending: false })
        .limit(200);

      const normalizeIp = (ip: string | null | undefined) => (ip || '').split(',')[0].trim();
      const isProxyAgent = (ua: string | null | undefined) =>
        /googleimageproxy|outlook/i.test(ua || '');

      const openCounts = (openData || []).reduce<Record<string, Set<string>>>((acc, open) => {
        const emailId = open.sent_email_id;
        if (!emailId) return acc;
        const ua = open.user_agent as string | null | undefined;
        const ip = normalizeIp(open.ip_address as string | null | undefined);
        const proxyKey = isProxyAgent(ua) ? `proxy:${ua?.toLowerCase() || 'unknown'}` : null;
        const dedupeKey = proxyKey || `${ua || 'unknown'}|${ip || 'unknown'}`;

        if (!acc[emailId]) acc[emailId] = new Set();
        acc[emailId].add(dedupeKey);
        return acc;
      }, {});

      setSentEmails(
        (sentData || []).map((email) => ({
          ...(email as SentEmail),
          openCount: openCounts[email.id]?.size || 0,
        }))
      );
      setOpens((openData || []) as EmailOpen[]);
      setReplies((replyData || []) as EmailReply[]);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSent = useMemo(() => {
    if (!searchQuery) return sentEmails;
    const q = searchQuery.toLowerCase();
    return sentEmails.filter((email) => {
      const contact = email.contact as any;
      return (
        email.subject.toLowerCase().includes(q) ||
        email.recipient_email.toLowerCase().includes(q) ||
        contact?.name?.toLowerCase().includes(q) ||
        contact?.company?.toLowerCase().includes(q)
      );
    });
  }, [sentEmails, searchQuery]);

  const sentEmailMap = useMemo(() => {
    return sentEmails.reduce<Record<string, SentEmailWithMeta>>((acc, email) => {
      acc[email.id] = email;
      return acc;
    }, {});
  }, [sentEmails]);

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-serif font-semibold text-foreground tracking-tight">
              Email Analytics
            </h1>
            <p className="text-muted-foreground mt-1">
              Track sent emails, opens, and replies with full details
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-[280px] bg-input border-border"
            />
          </div>
        </div>

        <Card className="bg-card border-border">
          <CardContent className="p-0">
            <Tabs defaultValue="sent">
              <div className="border-b border-border px-6 pt-4">
                <TabsList className="grid w-full sm:w-auto grid-cols-3">
                  <TabsTrigger value="sent" className="flex items-center gap-2">
                    <Mail className="w-4 h-4" /> Sent
                  </TabsTrigger>
                  <TabsTrigger value="opens" className="flex items-center gap-2">
                    <Eye className="w-4 h-4" /> Opens
                  </TabsTrigger>
                  <TabsTrigger value="replies" className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" /> Replies
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="sent" className="m-0">
                <div className="divide-y divide-border">
                  {loading ? (
                    <div className="p-8 text-center text-muted-foreground">Loading...</div>
                  ) : filteredSent.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">No sent emails found</div>
                  ) : (
                    filteredSent.map((email) => {
                      const contact = email.contact as any;
                      return (
                        <div
                          key={email.id}
                          className="p-4 hover:bg-secondary/30 transition-colors cursor-pointer"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground truncate">
                                {contact?.name || email.recipient_email}
                              </p>
                              <p className="text-sm text-muted-foreground truncate">
                                {email.subject}
                              </p>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {format(new Date(email.sent_at), 'MMM d, yyyy h:mm a')}
                                </span>
                                <Badge variant="secondary">Opens: {email.openCount || 0}</Badge>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedEmail(email)}
                            >
                              Open
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </TabsContent>

              <TabsContent value="opens" className="m-0">
                <div className="divide-y divide-border">
                  {loading ? (
                    <div className="p-8 text-center text-muted-foreground">Loading...</div>
                  ) : opens.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">No opens tracked yet</div>
                  ) : (
                    opens.map((open: any) => {
                      const sentEmail = sentEmailMap[open.sent_email_id];
                      return (
                      <div key={open.id} className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground">
                              {open.contact?.name || open.contact?.email || 'Unknown contact'}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">
                              {open.sent_email?.subject || 'No subject'}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {format(new Date(open.opened_at), 'MMM d, yyyy h:mm a')}
                            </p>
                          </div>
                          {sentEmail && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedEmail(sentEmail)}
                            >
                              Open
                            </Button>
                          )}
                        </div>
                      </div>
                    )})
                  )}
                </div>
              </TabsContent>

              <TabsContent value="replies" className="m-0">
                <div className="divide-y divide-border">
                  {loading ? (
                    <div className="p-8 text-center text-muted-foreground">Loading...</div>
                  ) : replies.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">No replies tracked yet</div>
                  ) : (
                    replies.map((reply: any) => {
                      const contact = reply.contact as any;
                      const sentEmail = reply.sent_email_id ? sentEmailMap[reply.sent_email_id] : null;
                      return (
                        <div key={reply.id} className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground">
                                {contact?.name || reply.contact_id}
                              </p>
                              <p className="text-sm text-muted-foreground truncate">
                                {reply.sent_email?.subject || reply.subject || 'No subject'}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">{reply.snippet || ''}</p>
                              <p className="text-xs text-muted-foreground mt-2">
                                {format(new Date(reply.received_at), 'MMM d, yyyy h:mm a')}
                              </p>
                            </div>
                            {sentEmail && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedEmail(sentEmail)}
                              >
                                Open
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Dialog open={!!selectedEmail} onOpenChange={() => setSelectedEmail(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">{selectedEmail?.subject}</DialogTitle>
            </DialogHeader>
            {selectedEmail && (
              <div className="space-y-4 mt-4">
                <div className="text-sm text-muted-foreground">
                  To: {selectedEmail.recipient_email}
                </div>
                <div
                  className="prose prose-sm max-w-none text-foreground"
                  dangerouslySetInnerHTML={{
                    __html: selectedEmail.body.replace(/\n/g, '<br>'),
                  }}
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
