import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { SentEmail } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, Search, Filter, Clock, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function SentEmails() {
  const [emails, setEmails] = useState<SentEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    fetchEmails();
  }, []);

  const fetchEmails = async () => {
    const { data, error } = await supabase
      .from('sent_emails')
      .select(`
        *,
        contact:contacts(name, email, company),
        sender_account:sender_accounts(email, display_name)
      `)
      .order('sent_at', { ascending: false });

    if (!error && data) {
      setEmails(data as unknown as SentEmail[]);
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

  const getDraftTypeBadge = (type: string) => {
    const variants: Record<string, string> = {
      first_outreach: 'bg-primary/20 text-primary border-primary/30',
      second_followup: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      final_followup: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    };
    return <Badge className={variants[type] || 'bg-secondary'}>{getDraftTypeLabel(type)}</Badge>;
  };

  const filteredEmails = emails.filter((email) => {
    const contact = email.contact as any;
    const matchesSearch = 
      (contact?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       contact?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       contact?.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       email.subject.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesFilter = filterType === 'all' || email.draft_type === filterType;
    
    return matchesSearch && matchesFilter;
  });

  return (
    <MainLayout>
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-4xl font-bold font-serif text-gradient-gold">Sent Emails</h1>
          <p className="text-muted-foreground mt-2">
            Track all emails sent through your outreach campaigns
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-input border-border"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[160px] bg-input border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="first_outreach">1st Outreach</SelectItem>
                <SelectItem value="second_followup">2nd Follow-up</SelectItem>
                <SelectItem value="final_followup">Final Follow-up</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-gold-subtle border border-primary/20">
                <Send className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{emails.length}</p>
                <p className="text-sm text-muted-foreground">Total Sent</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                <CheckCircle className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {emails.filter(e => e.draft_type === 'first_outreach').length}
                </p>
                <p className="text-sm text-muted-foreground">1st Outreach</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <Clock className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {emails.filter(e => e.draft_type === 'second_followup').length}
                </p>
                <p className="text-sm text-muted-foreground">2nd Follow-up</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <Send className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {emails.filter(e => e.draft_type === 'final_followup').length}
                </p>
                <p className="text-sm text-muted-foreground">Final Follow-up</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Emails List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i} className="bg-card border-border animate-pulse">
                <CardContent className="p-6 h-24" />
              </Card>
            ))}
          </div>
        ) : filteredEmails.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="p-12 text-center">
              <Send className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No Emails Sent Yet</h3>
              <p className="text-muted-foreground">
                Approve and send drafts to see them here
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredEmails.map((email) => {
              const contact = email.contact as any;
              const sender = email.sender_account as any;

              return (
                <Card key={email.id} className="bg-card border-border hover:border-primary/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="p-2 rounded-lg bg-gradient-gold-subtle border border-primary/20 mt-1">
                          <CheckCircle className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-foreground">
                              {contact?.name || email.recipient_email}
                            </p>
                            {getDraftTypeBadge(email.draft_type)}
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">
                            {contact?.company || 'Unknown Company'} • {email.recipient_email}
                          </p>
                          <p className="text-sm text-foreground font-medium">
                            Subject: {email.subject}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {format(new Date(email.sent_at), 'MMM d, yyyy h:mm a')}
                            </span>
                            <span>From: {sender?.display_name || sender?.email}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
