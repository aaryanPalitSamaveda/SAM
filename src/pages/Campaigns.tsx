import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
  Plus,
  Rocket,
  Pause,
  Play,
  Settings,
  Trash2,
  Mail,
  Users,
  Clock,
  MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Campaign, ContactList, SenderAccount, CampaignStatus } from '@/types/database';

const statusColors: Record<CampaignStatus, string> = {
  draft: 'bg-secondary text-muted-foreground',
  active: 'bg-green-500/20 text-green-400 border-green-500/30',
  paused: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  completed: 'bg-primary/20 text-primary border-primary/30',
};

export default function Campaigns() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [lists, setLists] = useState<ContactList[]>([]);
  const [senderAccounts, setSenderAccounts] = useState<SenderAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    description: '',
    list_id: '',
    sender_account_id: '',
  });
  const [campaignStats, setCampaignStats] = useState<Record<string, { enrolled: number; replied: number }>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [campaignsRes, listsRes, accountsRes] = await Promise.all([
        supabase.from('campaigns').select('*').order('created_at', { ascending: false }),
        supabase.from('contact_lists').select('*'),
        supabase.from('sender_accounts').select('*').eq('is_active', true),
      ]);

      if (campaignsRes.error) throw campaignsRes.error;
      if (listsRes.error) throw listsRes.error;
      if (accountsRes.error) throw accountsRes.error;

      setCampaigns((campaignsRes.data || []) as Campaign[]);
      setLists(listsRes.data || []);
      setSenderAccounts(accountsRes.data || []);

      // Fetch stats for each campaign
      const stats: Record<string, { enrolled: number; replied: number }> = {};
      for (const campaign of campaignsRes.data || []) {
        const [enrolledRes, repliedRes] = await Promise.all([
          supabase
            .from('campaign_contacts')
            .select('*', { count: 'exact', head: true })
            .eq('campaign_id', campaign.id),
          supabase
            .from('campaign_contacts')
            .select('*', { count: 'exact', head: true })
            .eq('campaign_id', campaign.id)
            .eq('status', 'replied'),
        ]);
        stats[campaign.id] = {
          enrolled: enrolledRes.count || 0,
          replied: repliedRes.count || 0,
        };
      }
      setCampaignStats(stats);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch campaigns');
    } finally {
      setLoading(false);
    }
  };

  const createCampaign = async () => {
    if (!newCampaign.name.trim()) {
      toast.error('Please enter a campaign name');
      return;
    }

    const { data, error } = await supabase
      .from('campaigns')
      .insert([
        {
          name: newCampaign.name,
          description: newCampaign.description || null,
          list_id: newCampaign.list_id || null,
          sender_account_id: newCampaign.sender_account_id || null,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating campaign:', error);
      toast.error('Failed to create campaign');
      return;
    }

    toast.success('Campaign created');
    setIsCreateOpen(false);
    setNewCampaign({ name: '', description: '', list_id: '', sender_account_id: '' });
    navigate(`/campaigns/${data.id}`);
  };

  const toggleCampaignStatus = async (campaign: Campaign) => {
    const newStatus = campaign.status === 'active' ? 'paused' : 'active';
    
    const { error } = await supabase
      .from('campaigns')
      .update({ status: newStatus })
      .eq('id', campaign.id);

    if (error) {
      console.error('Error updating campaign:', error);
      toast.error('Failed to update campaign');
      return;
    }

    toast.success(`Campaign ${newStatus === 'active' ? 'activated' : 'paused'}`);
    fetchData();
  };

  const deleteCampaign = async (id: string) => {
    const { error } = await supabase.from('campaigns').delete().eq('id', id);

    if (error) {
      console.error('Error deleting campaign:', error);
      toast.error('Failed to delete campaign');
      return;
    }

    toast.success('Campaign deleted');
    fetchData();
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between animate-fade-in">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Rocket className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
                Outreach
              </span>
            </div>
            <h1 className="text-3xl font-serif font-semibold text-foreground tracking-tight">Campaigns</h1>
            <p className="text-muted-foreground mt-1">
              Create and manage email sequences for your outreach
            </p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button variant="gold">
                <Plus className="w-4 h-4 mr-2" />
                New Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-foreground">Create New Campaign</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Campaign Name *
                  </label>
                  <Input
                    value={newCampaign.name}
                    onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                    placeholder="e.g., Series A Outreach"
                    className="bg-input border-border"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Description
                  </label>
                  <Textarea
                    value={newCampaign.description}
                    onChange={(e) =>
                      setNewCampaign({ ...newCampaign, description: e.target.value })
                    }
                    placeholder="Brief description of this campaign..."
                    className="bg-input border-border"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Contact List
                  </label>
                  <Select
                    value={newCampaign.list_id}
                    onValueChange={(v) => setNewCampaign({ ...newCampaign, list_id: v })}
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
                    value={newCampaign.sender_account_id}
                    onValueChange={(v) =>
                      setNewCampaign({ ...newCampaign, sender_account_id: v })
                    }
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
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="gold" onClick={createCampaign}>
                    Create Campaign
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Campaigns Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {loading ? (
            Array(4)
              .fill(0)
              .map((_, i) => (
                <Card key={i} className="bg-card border-border animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-6 bg-secondary rounded w-1/2 mb-4" />
                    <div className="h-4 bg-secondary rounded w-3/4" />
                  </CardContent>
                </Card>
              ))
          ) : campaigns.length === 0 ? (
            <Card className="bg-card border-border col-span-full">
              <CardContent className="p-12 text-center">
                <Rocket className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">No campaigns yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first campaign to start automating your outreach
                </p>
                <Button variant="gold" onClick={() => setIsCreateOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Campaign
                </Button>
              </CardContent>
            </Card>
          ) : (
            campaigns.map((campaign) => (
              <Card
                key={campaign.id}
                className="bg-card border-border hover:border-primary/30 transition-colors cursor-pointer"
                onClick={() => navigate(`/campaigns/${campaign.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-foreground flex items-center gap-2">
                        <Rocket className="w-5 h-5 text-primary" />
                        {campaign.name}
                      </CardTitle>
                      {campaign.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {campaign.description}
                        </p>
                      )}
                    </div>
                    <Badge className={statusColors[campaign.status as CampaignStatus]}>
                      {campaign.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-4">
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-secondary/30 rounded-lg">
                      <Users className="w-4 h-4 text-primary mx-auto mb-1" />
                      <p className="text-lg font-semibold text-foreground">
                        {campaignStats[campaign.id]?.enrolled || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Enrolled</p>
                    </div>
                    <div className="text-center p-3 bg-secondary/30 rounded-lg">
                      <Mail className="w-4 h-4 text-primary mx-auto mb-1" />
                      <p className="text-lg font-semibold text-foreground">0</p>
                      <p className="text-xs text-muted-foreground">Sent</p>
                    </div>
                    <div className="text-center p-3 bg-secondary/30 rounded-lg">
                      <MessageSquare className="w-4 h-4 text-green-400 mx-auto mb-1" />
                      <p className="text-lg font-semibold text-foreground">
                        {campaignStats[campaign.id]?.replied || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Replied</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    {campaign.status !== 'completed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleCampaignStatus(campaign)}
                      >
                        {campaign.status === 'active' ? (
                          <>
                            <Pause className="w-4 h-4 mr-1" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-1" />
                            Start
                          </>
                        )}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/campaigns/${campaign.id}`)}
                    >
                      <Settings className="w-4 h-4 mr-1" />
                      Configure
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteCampaign(campaign.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </MainLayout>
  );
}
