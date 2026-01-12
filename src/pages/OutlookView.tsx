import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { SenderAccount } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Mail, 
  Inbox, 
  Send, 
  RefreshCw, 
  Loader2,
  Paperclip,
  Calendar,
  User
} from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface OutlookEmail {
  id: string;
  subject: string;
  bodyPreview: string;
  body: {
    contentType: string;
    content: string;
  };
  from: {
    emailAddress: {
      name: string;
      address: string;
    };
  };
  toRecipients?: Array<{
    emailAddress: {
      name: string;
      address: string;
    };
  }>;
  receivedDateTime: string;
  sentDateTime: string;
  isRead: boolean;
  hasAttachments: boolean;
  importance: string;
}

export default function OutlookView() {
  const [senderAccounts, setSenderAccounts] = useState<SenderAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [selectedFolder, setSelectedFolder] = useState<'inbox' | 'sent'>('inbox');
  const [inboxEmails, setInboxEmails] = useState<OutlookEmail[]>([]);
  const [sentEmails, setSentEmails] = useState<OutlookEmail[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<OutlookEmail | null>(null);

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      fetchEmails();
    }
  }, [selectedAccount, selectedFolder]);

  const fetchAccounts = async () => {
    const { data, error } = await supabase
      .from('sender_accounts')
      .select('*')
      .eq('is_active', true)
      .order('email', { ascending: true });

    if (!error && data) {
      setSenderAccounts(data as SenderAccount[]);
      if (data.length > 0) {
        setSelectedAccount(data[0].email);
      }
    }
  };

  const fetchEmails = async () => {
    if (!selectedAccount) return;

    setLoading(true);
    try {
      // Fetch inbox emails
      const inboxRes = await supabase.functions.invoke('fetch-outlook-emails', {
        body: { accountEmail: selectedAccount, folder: 'inbox', top: 100 },
      });

      if (inboxRes.error) {
        console.error('Inbox fetch error:', inboxRes.error);
        toast.error(`Failed to fetch inbox: ${inboxRes.error.message || 'Unknown error'}`);
      } else if (inboxRes.data?.error) {
        console.error('Inbox API error:', inboxRes.data.error);
        toast.error(`Failed to fetch inbox: ${inboxRes.data.error}`);
      } else if (inboxRes.data?.emails) {
        setInboxEmails(inboxRes.data.emails);
        if (inboxRes.data.emails.length === 0) {
          console.log('No inbox emails found');
        }
      } else {
        console.log('Unexpected inbox response:', inboxRes.data);
        setInboxEmails([]);
      }

      // Fetch sent emails
      const sentRes = await supabase.functions.invoke('fetch-outlook-emails', {
        body: { accountEmail: selectedAccount, folder: 'sent', top: 100 },
      });

      if (sentRes.error) {
        console.error('Sent fetch error:', sentRes.error);
        toast.error(`Failed to fetch sent emails: ${sentRes.error.message || 'Unknown error'}`);
      } else if (sentRes.data?.error) {
        console.error('Sent API error:', sentRes.data.error);
        toast.error(`Failed to fetch sent emails: ${sentRes.data.error}`);
      } else if (sentRes.data?.emails) {
        setSentEmails(sentRes.data.emails);
        if (sentRes.data.emails.length === 0) {
          console.log('No sent emails found');
        }
      } else {
        console.log('Unexpected sent response:', sentRes.data);
        setSentEmails([]);
      }
    } catch (error) {
      console.error('Error fetching emails:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const getEmails = () => selectedFolder === 'inbox' ? inboxEmails : sentEmails;

  const formatEmailDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

      if (diffInHours < 24) {
        return format(date, 'h:mm a');
      } else if (diffInHours < 168) {
        return format(date, 'EEE h:mm a');
      } else {
        return format(date, 'MMM d, yyyy');
      }
    } catch {
      return dateString;
    }
  };

  const renderEmailContent = (content: string) => {
    // Simple HTML rendering - in production, use a proper HTML sanitizer
    return { __html: content };
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
                Outlook View
              </span>
            </div>
            <h1 className="text-3xl font-serif font-semibold text-foreground tracking-tight">
              Email Inbox & Sent
            </h1>
            <p className="text-muted-foreground mt-1">
              View all emails (sent and received) for each account
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
              <SelectTrigger className="w-full sm:w-[250px] bg-input border-border">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {senderAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.email}>
                    {account.display_name || account.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              onClick={fetchEmails} 
              disabled={loading || !selectedAccount}
              className="w-full sm:w-auto"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {selectedAccount && (
          <Card className="bg-card border-border">
            <CardContent className="p-0">
              <Tabs value={selectedFolder} onValueChange={(v) => setSelectedFolder(v as 'inbox' | 'sent')}>
                <div className="border-b border-border px-6 pt-4">
                  <TabsList className="grid w-full sm:w-auto grid-cols-2 sm:grid-cols-2">
                    <TabsTrigger value="inbox" className="flex items-center gap-2">
                      <Inbox className="w-4 h-4" />
                      <span>Inbox</span>
                      {inboxEmails.length > 0 && (
                        <Badge variant="secondary" className="ml-1">
                          {inboxEmails.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="sent" className="flex items-center gap-2">
                      <Send className="w-4 h-4" />
                      <span>Sent</span>
                      {sentEmails.length > 0 && (
                        <Badge variant="secondary" className="ml-1">
                          {sentEmails.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="inbox" className="m-0">
                  <div className="divide-y divide-border">
                    {loading ? (
                      <div className="p-8 text-center">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Loading emails...</p>
                      </div>
                    ) : inboxEmails.length === 0 ? (
                      <div className="p-12 text-center">
                        <Inbox className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <p className="text-muted-foreground mb-2">No emails in inbox</p>
                        <p className="text-xs text-muted-foreground">
                          If you expected emails, check browser console for errors. 
                          Make sure Mail.Read permission is granted in Azure AD.
                        </p>
                      </div>
                    ) : (
                      inboxEmails.map((email) => (
                        <div
                          key={email.id}
                          className={`p-4 hover:bg-secondary/30 transition-colors cursor-pointer ${
                            !email.isRead ? 'bg-primary/5' : ''
                          }`}
                          onClick={() => setSelectedEmail(email)}
                        >
                          <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 mt-1">
                              {!email.isRead && (
                                <div className="w-2 h-2 rounded-full bg-primary" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-4 mb-1">
                                <div className="flex-1 min-w-0">
                                  <p className={`font-medium text-foreground truncate ${!email.isRead ? 'font-semibold' : ''}`}>
                                    {email.from.emailAddress.name || email.from.emailAddress.address}
                                  </p>
                                  <p className="text-sm text-muted-foreground truncate">
                                    {email.subject || '(No Subject)'}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {email.hasAttachments && (
                                    <Paperclip className="w-4 h-4 text-muted-foreground" />
                                  )}
                                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                                    {formatEmailDate(email.receivedDateTime)}
                                  </span>
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {email.bodyPreview}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="sent" className="m-0">
                  <div className="divide-y divide-border">
                    {loading ? (
                      <div className="p-8 text-center">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Loading emails...</p>
                      </div>
                    ) : sentEmails.length === 0 ? (
                      <div className="p-12 text-center">
                        <Send className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <p className="text-muted-foreground mb-2">No sent emails</p>
                        <p className="text-xs text-muted-foreground">
                          If you expected emails, check browser console for errors. 
                          Make sure Mail.Read permission is granted in Azure AD.
                        </p>
                      </div>
                    ) : (
                      sentEmails.map((email) => (
                        <div
                          key={email.id}
                          className="p-4 hover:bg-secondary/30 transition-colors cursor-pointer"
                          onClick={() => setSelectedEmail(email)}
                        >
                          <div className="flex items-start gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-4 mb-1">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-foreground truncate">
                                    To: {email.toRecipients?.[0]?.emailAddress?.name || email.toRecipients?.[0]?.emailAddress?.address || 'Unknown'}
                                  </p>
                                  <p className="text-sm text-muted-foreground truncate">
                                    {email.subject || '(No Subject)'}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {email.hasAttachments && (
                                    <Paperclip className="w-4 h-4 text-muted-foreground" />
                                  )}
                                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                                    {formatEmailDate(email.sentDateTime)}
                                  </span>
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {email.bodyPreview}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {!selectedAccount && (
          <Card className="bg-card border-border">
            <CardContent className="p-12 text-center">
              <Mail className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No Account Selected</h3>
              <p className="text-muted-foreground">
                Please select a sender account to view emails
              </p>
            </CardContent>
          </Card>
        )}

        {/* Email Detail Dialog */}
        <Dialog open={!!selectedEmail} onOpenChange={() => setSelectedEmail(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">
                {selectedEmail?.subject || '(No Subject)'}
              </DialogTitle>
            </DialogHeader>
            {selectedEmail && (
              <div className="space-y-4 mt-4">
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground border-b border-border pb-4">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>
                      {selectedFolder === 'inbox' ? 'From' : 'To'}:{' '}
                      {selectedFolder === 'inbox'
                        ? selectedEmail.from.emailAddress.name || selectedEmail.from.emailAddress.address
                        : selectedEmail.toRecipients?.[0]?.emailAddress?.name || selectedEmail.toRecipients?.[0]?.emailAddress?.address}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {format(new Date(selectedFolder === 'inbox' ? selectedEmail.receivedDateTime : selectedEmail.sentDateTime), 'PPpp')}
                    </span>
                  </div>
                  {selectedEmail.hasAttachments && (
                    <div className="flex items-center gap-2">
                      <Paperclip className="w-4 h-4" />
                      <span>Has attachments</span>
                    </div>
                  )}
                </div>
                <div 
                  className="prose prose-sm max-w-none text-foreground"
                  dangerouslySetInnerHTML={renderEmailContent(selectedEmail.body.content || selectedEmail.bodyPreview)}
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
