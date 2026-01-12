import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Settings as SettingsIcon, Shield, Clock, Zap, Pen } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Settings() {
  return (
    <MainLayout>
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-4xl font-bold font-serif text-gradient-gold">Settings</h1>
          <p className="text-muted-foreground mt-2">
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
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                <div>
                  <p className="font-medium text-foreground">Claude API</p>
                  <p className="text-sm text-muted-foreground">For AI-powered email generation</p>
                </div>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Connected</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
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
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                <div>
                  <p className="font-medium text-foreground">2nd Follow-up</p>
                  <p className="text-sm text-muted-foreground">After 1st outreach</p>
                </div>
                <Badge className="bg-primary/20 text-primary border-primary/30">2 Days</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
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
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                <div>
                  <p className="font-medium text-foreground">Emails per Hour</p>
                  <p className="text-sm text-muted-foreground">To avoid spam detection</p>
                </div>
                <Badge className="bg-primary/20 text-primary border-primary/30">30</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
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
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
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

          {/* System Info */}
          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <SettingsIcon className="w-5 h-5 text-primary" />
                System Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                <p className="font-medium text-foreground">Version</p>
                <span className="text-muted-foreground">1.0.0</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
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
