import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  Plus,
  Save,
  Trash2,
  Mail,
  Clock,
  Users,
  Play,
  Pause,
  Settings,
  MessageSquare,
  GripVertical,
} from 'lucide-react';
import { toast } from 'sonner';
import type {
  Campaign,
  CampaignSequence,
  CampaignSettings,
  CampaignContact,
  ContactList,
  SenderAccount,
} from '@/types/database';

const DAYS_OF_WEEK = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Singapore',
];

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [sequences, setSequences] = useState<CampaignSequence[]>([]);
  const [settings, setSettings] = useState<CampaignSettings | null>(null);
  const [contacts, setContacts] = useState<CampaignContact[]>([]);
  const [lists, setLists] = useState<ContactList[]>([]);
  const [senderAccounts, setSenderAccounts] = useState<SenderAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddSequenceOpen, setIsAddSequenceOpen] = useState(false);
  const [newSequence, setNewSequence] = useState({
    name: '',
    subject_template: '',
    body_template: '',
    delay_days: 0,
    delay_hours: 0,
  });

  useEffect(() => {
    if (id) fetchCampaign();
  }, [id]);

  const fetchCampaign = async () => {
    if (!id) return;

    try {
      const [campaignRes, sequencesRes, settingsRes, contactsRes, listsRes, accountsRes] =
        await Promise.all([
          supabase.from('campaigns').select('*').eq('id', id).single(),
          supabase
            .from('campaign_sequences')
            .select('*')
            .eq('campaign_id', id)
            .order('sequence_order'),
          supabase.from('campaign_settings').select('*').eq('campaign_id', id).single(),
          supabase
            .from('campaign_contacts')
            .select(`*, contact:contacts(*)`)
            .eq('campaign_id', id),
          supabase.from('contact_lists').select('*'),
          supabase.from('sender_accounts').select('*').eq('is_active', true),
        ]);

      if (campaignRes.error) throw campaignRes.error;

      setCampaign(campaignRes.data as Campaign);
      setSequences(sequencesRes.data || []);
      setSettings(settingsRes.data);
      setContacts((contactsRes.data || []) as CampaignContact[]);
      setLists(listsRes.data || []);
      setSenderAccounts(accountsRes.data || []);
    } catch (error) {
      console.error('Error fetching campaign:', error);
      toast.error('Failed to fetch campaign');
    } finally {
      setLoading(false);
    }
  };

  const updateCampaign = async (updates: Partial<Campaign>) => {
    if (!id) return;

    const { error } = await supabase.from('campaigns').update(updates).eq('id', id);

    if (error) {
      console.error('Error updating campaign:', error);
      toast.error('Failed to update campaign');
      return;
    }

    setCampaign((prev) => (prev ? { ...prev, ...updates } : null));
    toast.success('Campaign updated');
  };

  const updateSettings = async (updates: Partial<CampaignSettings>) => {
    if (!id || !settings) return;

    const { error } = await supabase
      .from('campaign_settings')
      .update(updates)
      .eq('campaign_id', id);

    if (error) {
      console.error('Error updating settings:', error);
      toast.error('Failed to update settings');
      return;
    }

    setSettings((prev) => (prev ? { ...prev, ...updates } : null));
    toast.success('Settings updated');
  };

  const addSequence = async () => {
    if (!id) return;
    if (!newSequence.name.trim() || !newSequence.subject_template.trim()) {
      toast.error('Please fill in required fields');
      return;
    }

    const { error } = await supabase.from('campaign_sequences').insert([
      {
        campaign_id: id,
        sequence_order: sequences.length + 1,
        name: newSequence.name,
        subject_template: newSequence.subject_template,
        body_template: newSequence.body_template,
        delay_days: newSequence.delay_days,
        delay_hours: newSequence.delay_hours,
      },
    ]);

    if (error) {
      console.error('Error adding sequence:', error);
      toast.error('Failed to add sequence');
      return;
    }

    toast.success('Sequence added');
    setIsAddSequenceOpen(false);
    setNewSequence({
      name: '',
      subject_template: '',
      body_template: '',
      delay_days: 0,
      delay_hours: 0,
    });
    fetchCampaign();
  };

  const deleteSequence = async (sequenceId: string) => {
    const { error } = await supabase.from('campaign_sequences').delete().eq('id', sequenceId);

    if (error) {
      console.error('Error deleting sequence:', error);
      toast.error('Failed to delete sequence');
      return;
    }

    toast.success('Sequence deleted');
    fetchCampaign();
  };

  const enrollListContacts = async () => {
    if (!id || !campaign?.list_id) {
      toast.error('Please select a contact list first');
      return;
    }

    // Get contacts from the list
    const { data: listMembers, error: listError } = await supabase
      .from('contact_list_members')
      .select('contact_id')
      .eq('list_id', campaign.list_id);

    if (listError) {
      console.error('Error fetching list members:', listError);
      toast.error('Failed to fetch list contacts');
      return;
    }

    if (!listMembers || listMembers.length === 0) {
      toast.error('No contacts in this list');
      return;
    }

    // Enroll contacts
    const enrollments = listMembers.map((member) => ({
      campaign_id: id,
      contact_id: member.contact_id,
    }));

    const { error } = await supabase.from('campaign_contacts').insert(enrollments);

    if (error) {
      if (error.code === '23505') {
        toast.error('Some contacts are already enrolled');
      } else {
        console.error('Error enrolling contacts:', error);
        toast.error('Failed to enroll contacts');
      }
      return;
    }

    toast.success(`Enrolled ${enrollments.length} contacts`);
    fetchCampaign();
  };

  const toggleCampaignStatus = async () => {
    if (!campaign) return;
    const newStatus = campaign.status === 'active' ? 'paused' : 'active';
    await updateCampaign({ status: newStatus });
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="animate-pulse space-y-6">
          <div className="h-10 bg-secondary rounded w-1/4" />
          <div className="h-6 bg-secondary rounded w-1/2" />
          <div className="h-64 bg-secondary rounded" />
        </div>
      </MainLayout>
    );
  }

  if (!campaign) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Campaign not found</p>
          <Button variant="gold" onClick={() => navigate('/campaigns')} className="mt-4">
            Back to Campaigns
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/campaigns')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-4xl font-bold font-serif text-gradient-gold">{campaign.name}</h1>
              {campaign.description && (
                <p className="text-muted-foreground mt-1">{campaign.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge
              className={
                campaign.status === 'active'
                  ? 'bg-green-500/20 text-green-400 border-green-500/30'
                  : campaign.status === 'paused'
                  ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                  : 'bg-secondary text-muted-foreground'
              }
            >
              {campaign.status}
            </Badge>
            <Button variant="outline" onClick={toggleCampaignStatus}>
              {campaign.status === 'active' ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Start
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="sequences" className="space-y-6">
          <TabsList className="bg-secondary">
            <TabsTrigger value="sequences">
              <Mail className="w-4 h-4 mr-2" />
              Sequences
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="contacts">
              <Users className="w-4 h-4 mr-2" />
              Contacts ({contacts.length})
            </TabsTrigger>
            <TabsTrigger value="replies">
              <MessageSquare className="w-4 h-4 mr-2" />
              Replies
            </TabsTrigger>
          </TabsList>

          {/* Sequences Tab */}
          <TabsContent value="sequences" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">Email Sequence</h2>
              <Dialog open={isAddSequenceOpen} onOpenChange={setIsAddSequenceOpen}>
                <DialogTrigger asChild>
                  <Button variant="gold">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Step
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border max-w-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-foreground">Add Sequence Step</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Step Name *
                      </label>
                      <Input
                        value={newSequence.name}
                        onChange={(e) =>
                          setNewSequence({ ...newSequence, name: e.target.value })
                        }
                        placeholder="e.g., Initial Outreach"
                        className="bg-input border-border"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">
                          Delay (Days)
                        </label>
                        <Input
                          type="number"
                          min="0"
                          value={newSequence.delay_days}
                          onChange={(e) =>
                            setNewSequence({
                              ...newSequence,
                              delay_days: parseInt(e.target.value) || 0,
                            })
                          }
                          className="bg-input border-border"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">
                          Delay (Hours)
                        </label>
                        <Input
                          type="number"
                          min="0"
                          max="23"
                          value={newSequence.delay_hours}
                          onChange={(e) =>
                            setNewSequence({
                              ...newSequence,
                              delay_hours: parseInt(e.target.value) || 0,
                            })
                          }
                          className="bg-input border-border"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Subject Template *
                      </label>
                      <Input
                        value={newSequence.subject_template}
                        onChange={(e) =>
                          setNewSequence({ ...newSequence, subject_template: e.target.value })
                        }
                        placeholder="Use {{name}}, {{company}} for personalization"
                        className="bg-input border-border"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Body Template
                      </label>
                      <Textarea
                        value={newSequence.body_template}
                        onChange={(e) =>
                          setNewSequence({ ...newSequence, body_template: e.target.value })
                        }
                        placeholder="Email body with {{name}}, {{company}} placeholders..."
                        className="bg-input border-border min-h-[150px]"
                      />
                    </div>
                    <div className="flex justify-end gap-3">
                      <Button variant="outline" onClick={() => setIsAddSequenceOpen(false)}>
                        Cancel
                      </Button>
                      <Button variant="gold" onClick={addSequence}>
                        Add Step
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {sequences.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="p-12 text-center">
                  <Mail className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">No sequences yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Add email steps to create your outreach sequence
                  </p>
                  <Button variant="gold" onClick={() => setIsAddSequenceOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Step
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {sequences.map((seq, index) => (
                  <Card key={seq.id} className="bg-card border-border">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="flex items-center gap-2">
                          <GripVertical className="w-4 h-4 text-muted-foreground" />
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold">
                            {index + 1}
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-foreground">{seq.name}</h3>
                            <div className="flex items-center gap-2">
                              <Badge className="bg-secondary text-muted-foreground">
                                <Clock className="w-3 h-3 mr-1" />
                                {seq.delay_days}d {seq.delay_hours}h delay
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => deleteSequence(seq.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm text-primary mb-2">
                            Subject: {seq.subject_template}
                          </p>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {seq.body_template}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Campaign Settings */}
              <Card className="bg-card border-border">
                <CardHeader className="border-b border-border">
                  <CardTitle className="text-foreground">Campaign Settings</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      Contact List
                    </label>
                    <Select
                      value={campaign.list_id || ''}
                      onValueChange={(v) => updateCampaign({ list_id: v })}
                    >
                      <SelectTrigger className="bg-input border-border">
                        <SelectValue placeholder="Select a list" />
                      </SelectTrigger>
                      <SelectContent>
                        {lists.map((list) => (
                          <SelectItem key={list.id} value={list.id}>
                            {list.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      Sender Account
                    </label>
                    <Select
                      value={campaign.sender_account_id || ''}
                      onValueChange={(v) => updateCampaign({ sender_account_id: v })}
                    >
                      <SelectTrigger className="bg-input border-border">
                        <SelectValue placeholder="Select sender" />
                      </SelectTrigger>
                      <SelectContent>
                        {senderAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.display_name || account.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Scheduling Settings */}
              {settings && (
                <Card className="bg-card border-border">
                  <CardHeader className="border-b border-border">
                    <CardTitle className="text-foreground flex items-center gap-2">
                      <Clock className="w-5 h-5 text-primary" />
                      Scheduling
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">
                          Send Window Start
                        </label>
                        <Input
                          type="time"
                          value={settings.send_window_start}
                          onChange={(e) => updateSettings({ send_window_start: e.target.value })}
                          className="bg-input border-border"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">
                          Send Window End
                        </label>
                        <Input
                          type="time"
                          value={settings.send_window_end}
                          onChange={(e) => updateSettings({ send_window_end: e.target.value })}
                          className="bg-input border-border"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Timezone
                      </label>
                      <Select
                        value={settings.timezone}
                        onValueChange={(v) => updateSettings({ timezone: v })}
                      >
                        <SelectTrigger className="bg-input border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIMEZONES.map((tz) => (
                            <SelectItem key={tz} value={tz}>
                              {tz}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Send Days
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {DAYS_OF_WEEK.map((day) => (
                          <Button
                            key={day}
                            variant={settings.send_days.includes(day) ? 'gold' : 'outline'}
                            size="sm"
                            onClick={() => {
                              const newDays = settings.send_days.includes(day)
                                ? settings.send_days.filter((d) => d !== day)
                                : [...settings.send_days, day];
                              updateSettings({ send_days: newDays });
                            }}
                          >
                            {day.slice(0, 3)}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">
                          Daily Limit
                        </label>
                        <Input
                          type="number"
                          min="1"
                          value={settings.daily_limit}
                          onChange={(e) =>
                            updateSettings({ daily_limit: parseInt(e.target.value) || 50 })
                          }
                          className="bg-input border-border"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">
                          Delay Between Emails (sec)
                        </label>
                        <Input
                          type="number"
                          min="30"
                          value={settings.delay_between_emails_seconds}
                          onChange={(e) =>
                            updateSettings({
                              delay_between_emails_seconds: parseInt(e.target.value) || 120,
                            })
                          }
                          className="bg-input border-border"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Contacts Tab */}
          <TabsContent value="contacts" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">Enrolled Contacts</h2>
              <Button variant="gold" onClick={enrollListContacts}>
                <Users className="w-4 h-4 mr-2" />
                Enroll from List
              </Button>
            </div>

            {contacts.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="p-12 text-center">
                  <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">No contacts enrolled</h3>
                  <p className="text-muted-foreground mb-4">
                    Enroll contacts from your selected list to start the campaign
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-card border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contact</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Current Step</TableHead>
                      <TableHead>Last Email</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contacts.map((cc: any) => (
                      <TableRow key={cc.id}>
                        <TableCell className="font-medium text-foreground">
                          {cc.contact?.name || '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {cc.contact?.email}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              cc.status === 'replied'
                                ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                : cc.status === 'in_progress'
                                ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                : 'bg-secondary text-muted-foreground'
                            }
                          >
                            {cc.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          Step {cc.current_sequence_step + 1}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {cc.last_email_sent_at
                            ? new Date(cc.last_email_sent_at).toLocaleDateString()
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>

          {/* Replies Tab */}
          <TabsContent value="replies" className="space-y-6">
            <Card className="bg-card border-border">
              <CardContent className="p-12 text-center">
                <MessageSquare className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">Reply Tracking</h3>
                <p className="text-muted-foreground">
                  Replies will appear here when contacts respond to your emails.
                  <br />
                  Contacts who reply will automatically be removed from the sequence.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
