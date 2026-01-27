import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Settings as SettingsIcon, Shield, Clock, Zap, Pen, MessageSquare, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function Settings() {
  const [replyTrackingActive, setReplyTrackingActive] = useState(false);
  const [replyTrackingLoading, setReplyTrackingLoading] = useState(false);
  const [replySyncLoading, setReplySyncLoading] = useState(false);
  const [replySyncStatus, setReplySyncStatus] = useState<{
    lastRunAt: string;
    inserted: number;
    skipped: number;
  } | null>(null);

  useEffect(() => {
    fetchReplyTrackingStatus();
  }, []);

  const fetchReplyTrackingStatus = async () => {
    setReplyTrackingLoading(true);
    const { count } = await supabase
      .from('graph_subscriptions')
      .select('id', { count: 'exact', head: true });
    setReplyTrackingActive((count || 0) > 0);
    setReplyTrackingLoading(false);
  };

  const setupReplyTracking = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('setup-reply-subscriptions', {
        body: {},
      });

      if (error) {
        toast.error(`Failed to setup reply tracking: ${error.message || 'Unknown error'}`);
        return;
      }

      if (data?.error) {
        toast.error(`Failed to setup reply tracking: ${data.error}`);
        return;
      }

      toast.success('Reply tracking subscriptions created!');
      fetchReplyTrackingStatus();
    } catch (err) {
      toast.error(`Failed to setup reply tracking: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold text-foreground">Settings</h1>
          <p className="text-muted-foreground text-sm">
            Configure your SamaReach application settings
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* API Configuration */}
          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Shield className="w-5 h-5 text-primary" />
                API Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 divide-y divide-border">
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-foreground">Claude API</p>
                  <p className="text-sm text-muted-foreground">For AI-powered email generation</p>
                </div>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Connected</Badge>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-foreground">Microsoft Graph API</p>
                  <p className="text-sm text-muted-foreground">For Outlook email sending</p>
                </div>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Connected</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Email Scheduling */}
          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Clock className="w-5 h-5 text-primary" />
                Follow-up Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 divide-y divide-border">
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-foreground">2nd Follow-up</p>
                  <p className="text-sm text-muted-foreground">After 1st outreach</p>
                </div>
                <Badge className="bg-primary/20 text-primary border-primary/30">2 Days</Badge>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-foreground">Final Follow-up</p>
                  <p className="text-sm text-muted-foreground">After 1st outreach</p>
                </div>
                <Badge className="bg-primary/20 text-primary border-primary/30">7 Days</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Rate Limiting */}
          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Zap className="w-5 h-5 text-primary" />
                Rate Limiting
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 divide-y divide-border">
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-foreground">Emails per Hour</p>
                  <p className="text-sm text-muted-foreground">To avoid spam detection</p>
                </div>
                <Badge className="bg-primary/20 text-primary border-primary/30">30</Badge>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-foreground">Delay Between Emails</p>
                  <p className="text-sm text-muted-foreground">Random variance applied</p>
                </div>
                <Badge className="bg-primary/20 text-primary border-primary/30">30-60 sec</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Email Signatures */}
          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Pen className="w-5 h-5 text-primary" />
                Email Signatures
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Manage Signatures</p>
                  <p className="text-sm text-muted-foreground">Add logos and signatures to emails</p>
                </div>
                <Link to="/signatures">
                  <Button variant="outline" size="sm">
                    <Pen className="w-4 h-4 mr-2" />
                    Manage
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Reply Tracking */}
          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <MessageSquare className="w-5 h-5 text-primary" />
                Reply Tracking
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-foreground">Microsoft Graph Subscriptions</p>
                  <p className="text-sm text-muted-foreground">Track replies automatically from Outlook inbox</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={replyTrackingActive ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-destructive/20 text-destructive border-destructive/30'}>
                    {replyTrackingActive ? 'Active' : 'Inactive'}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchReplyTrackingStatus}
                    disabled={replyTrackingLoading}
                  >
                    <RefreshCw className={`w-4 h-4 ${replyTrackingLoading ? 'animate-spin' : ''}`} />
                  </Button>
                  <button
                    onClick={setupReplyTracking}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary/10 text-primary border border-primary/30 px-3 py-2 hover:bg-primary/20"
                  >
                    Setup Tracking
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between py-3 border-t border-border">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">Manual Reply Sync (Fallback)</p>
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                      Active
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">Fetch replies directly from inbox if webhook misses</p>
                  {replySyncStatus && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Last sync: {new Date(replySyncStatus.lastRunAt).toLocaleString()} • Added {replySyncStatus.inserted} • Skipped {replySyncStatus.skipped}
                    </p>
                  )}
                </div>
                <button
                  onClick={async () => {
                    setReplySyncLoading(true);
                    const { data, error } = await supabase.functions.invoke('sync-replies', { body: {} });
                    if (error) {
                      toast.error(`Sync failed: ${error.message || 'Unknown error'}`);
                      setReplySyncLoading(false);
                      return;
                    }
                    if (data?.error) {
                      toast.error(`Sync failed: ${data.error}`);
                      setReplySyncLoading(false);
                      return;
                    }
                    setReplySyncStatus({
                      lastRunAt: new Date().toISOString(),
                      inserted: data?.inserted || 0,
                      skipped: data?.skipped || 0,
                    });
                    toast.success(`Reply sync complete. Added ${data?.inserted || 0} replies.`);
                    setReplySyncLoading(false);
                  }}
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary/10 text-primary border border-primary/30 px-3 py-2 hover:bg-primary/20 disabled:opacity-60"
                  disabled={replySyncLoading}
                >
                  {replySyncLoading ? 'Syncing...' : 'Sync Now'}
                </button>
              </div>
              <p className="text-xs text-muted-foreground pt-2">
                Status is based on active Graph subscriptions saved in the database.
              </p>
            </CardContent>
          </Card>

          {/* System Info */}
          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <SettingsIcon className="w-5 h-5 text-primary" />
                System Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 divide-y divide-border">
              <div className="flex items-center justify-between py-3">
                <p className="font-medium text-foreground">Version</p>
                <span className="text-muted-foreground">1.0.0</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <p className="font-medium text-foreground">Environment</p>
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Production</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
