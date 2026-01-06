import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { SenderAccount } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, Mail, User, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function SenderAccounts() {
  const [accounts, setAccounts] = useState<SenderAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    const { data, error } = await supabase
      .from('sender_accounts')
      .select('*')
      .order('created_at', { ascending: true });

    if (!error && data) {
      setAccounts(data as SenderAccount[]);
    }
    setLoading(false);
  };

  const handleAddAccount = async () => {
    if (!newEmail) {
      toast.error('Please enter an email address');
      return;
    }

    const { error } = await supabase
      .from('sender_accounts')
      .insert({
        email: newEmail,
        display_name: newDisplayName || null,
      });

    if (error) {
      if (error.code === '23505') {
        toast.error('This email is already added');
      } else {
        toast.error('Failed to add account');
      }
    } else {
      toast.success('Account added successfully');
      setNewEmail('');
      setNewDisplayName('');
      setIsDialogOpen(false);
      fetchAccounts();
    }
  };

  const handleToggleActive = async (account: SenderAccount) => {
    const { error } = await supabase
      .from('sender_accounts')
      .update({ is_active: !account.is_active })
      .eq('id', account.id);

    if (error) {
      toast.error('Failed to update account');
    } else {
      toast.success(account.is_active ? 'Account deactivated' : 'Account activated');
      fetchAccounts();
    }
  };

  const handleDeleteAccount = async (id: string) => {
    const { error } = await supabase
      .from('sender_accounts')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete account');
    } else {
      toast.success('Account deleted');
      fetchAccounts();
    }
  };

  return (
    <MainLayout>
      <div className="space-y-8 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold font-serif text-gradient-gold">Sender Accounts</h1>
            <p className="text-muted-foreground mt-2">
              Manage Outlook accounts used for sending outreach emails
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="gold" className="gap-2">
                <Plus className="w-4 h-4" />
                Add Account
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-foreground">Add Sender Account</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Email Address <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="email@samavedacapital.com"
                    className="bg-input border-border"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Display Name
                  </label>
                  <Input
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    placeholder="e.g., John Doe"
                    className="bg-input border-border"
                  />
                </div>
                <Button variant="gold" onClick={handleAddAccount} className="w-full">
                  Add Account
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            [1, 2, 3].map((i) => (
              <Card key={i} className="bg-card border-border animate-pulse">
                <CardContent className="p-6 h-32" />
              </Card>
            ))
          ) : accounts.length === 0 ? (
            <Card className="bg-card border-border col-span-full">
              <CardContent className="p-12 text-center">
                <Mail className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-xl font-semibold text-foreground mb-2">No Sender Accounts</h3>
                <p className="text-muted-foreground">
                  Add Outlook accounts to start sending emails
                </p>
              </CardContent>
            </Card>
          ) : (
            accounts.map((account) => (
              <Card 
                key={account.id} 
                className={`bg-card border-border transition-all duration-200 ${
                  account.is_active ? 'hover:border-primary/30 hover:shadow-gold' : 'opacity-60'
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 rounded-lg bg-gradient-gold-subtle border border-primary/20">
                      <Mail className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={account.is_active}
                        onCheckedChange={() => handleToggleActive(account)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteAccount(account.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-foreground">{account.email}</p>
                      {account.is_active && (
                        <Check className="w-4 h-4 text-green-400" />
                      )}
                    </div>
                    {account.display_name && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <User className="w-3 h-3" />
                        {account.display_name}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Info Card */}
        <Card className="bg-card border-border">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-foreground">About Outlook Integration</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>
                SamaReach uses Microsoft Graph API to send emails through your Outlook accounts. 
                Make sure your Azure App has the proper permissions configured.
              </p>
              <div className="bg-secondary/50 rounded-lg p-4">
                <p className="font-medium text-foreground mb-2">Required Microsoft Graph Permissions:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Mail.Send - To send emails on behalf of users</li>
                  <li>User.Read - To read user profile information</li>
                </ul>
              </div>
              <p>
                Emails are sent with rate limiting to avoid triggering spam filters and maintain 
                a good sender reputation.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
