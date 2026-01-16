import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { EmailDraft, Contact, EmailTemplate, SenderAccount } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Sparkles, 
  Mail, 
  Check, 
  Edit, 
  Send, 
  Loader2,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Trash2,
  Pen
} from 'lucide-react';
import { toast } from 'sonner';

interface DraftWithContact extends EmailDraft {
  contact: Contact;
}

export default function Drafts() {
  const [drafts, setDrafts] = useState<DraftWithContact[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [senderAccounts, setSenderAccounts] = useState<SenderAccount[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [selectedSender, setSelectedSender] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [editingDraft, setEditingDraft] = useState<DraftWithContact | null>(null);
  const [editedSubject, setEditedSubject] = useState('');
  const [editedBody, setEditedBody] = useState('');
  const [expandedContacts, setExpandedContacts] = useState<Set<string>>(new Set());
  const [signatures, setSignatures] = useState<any[]>([]);
  const [includeSignature, setIncludeSignature] = useState(true);
  const [selectedSignatureId, setSelectedSignatureId] = useState<string>('');

  useEffect(() => {
    fetchData();
    fetchSignatures();
  }, []);

  const fetchSignatures = async () => {
    const { data } = await supabase
      .from('email_signatures')
      .select('*')
      .order('is_default', { ascending: false });
    
    if (data) {
      setSignatures(data);
      const defaultSig = data.find((s: any) => s.is_default);
      if (defaultSig) {
        setSelectedSignatureId(defaultSig.id);
      }
    }
  };

  const fetchData = async () => {
    setLoading(true);
    const [draftsRes, templatesRes, sendersRes, contactsRes] = await Promise.all([
      supabase
        .from('email_drafts')
        .select('*, contact:contacts(*)')
        .order('created_at', { ascending: false }),
      supabase.from('email_templates').select('*').eq('is_active', true),
      supabase.from('sender_accounts').select('*').eq('is_active', true),
      supabase.from('contacts').select('*').order('created_at', { ascending: false }),
    ]);

    if (draftsRes.data) setDrafts(draftsRes.data as unknown as DraftWithContact[]);
    if (templatesRes.data) setTemplates(templatesRes.data as EmailTemplate[]);
    if (sendersRes.data) {
      setSenderAccounts(sendersRes.data as SenderAccount[]);
      if (sendersRes.data.length > 0) setSelectedSender(sendersRes.data[0].id);
    }
    if (contactsRes.data) setContacts(contactsRes.data as Contact[]);
    
    setLoading(false);
  };

  const generateDrafts = async () => {
    if (!selectedTemplate) {
      toast.error('Please select a template first');
      return;
    }

    const template = templates.find(t => t.id === selectedTemplate);
    if (!template) return;

    // Find contacts without drafts
    const contactsWithDrafts = new Set(drafts.map(d => d.contact_id));
    const contactsWithoutDrafts = contacts.filter(c => !contactsWithDrafts.has(c.id));

    if (contactsWithoutDrafts.length === 0) {
      toast.info('All contacts already have drafts generated');
      return;
    }

    setGenerating(true);
    toast.info(`Generating drafts for ${contactsWithoutDrafts.length} contacts...`);

    try {
      const { data, error } = await supabase.functions.invoke('generate-drafts', {
        body: {
          contacts: contactsWithoutDrafts,
          template: template.template_content,
        },
      });

      if (error) throw error;

      toast.success(`Generated drafts for ${contactsWithoutDrafts.length} contacts!`);
      fetchData();
    } catch (error) {
      console.error('Error generating drafts:', error);
      toast.error('Failed to generate drafts. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const approveDraft = async (draft: DraftWithContact) => {
    const { error } = await supabase
      .from('email_drafts')
      .update({ 
        status: 'approved',
        approved_at: new Date().toISOString(),
      })
      .eq('id', draft.id);

    if (error) {
      toast.error('Failed to approve draft');
    } else {
      toast.success('Draft approved!');
      fetchData();
    }
  };

  const saveDraftEdit = async () => {
    if (!editingDraft) return;

    const { error } = await supabase
      .from('email_drafts')
      .update({
        edited_subject: editedSubject,
        edited_body: editedBody,
        include_signature: includeSignature,
        signature_id: includeSignature && selectedSignatureId ? selectedSignatureId : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editingDraft.id);

    if (error) {
      toast.error('Failed to save changes');
    } else {
      toast.success('Changes saved!');
      setEditingDraft(null);
      fetchData();
    }
  };

  const getSignatureContent = (signatureId: string) => {
    const signature = signatures.find((s: any) => s.id === signatureId);
    if (!signature) return '';
    // Build signature: content first, then image at bottom
    let sigContent = signature.content;
    if (signature.image_url) {
      sigContent = `${sigContent}<br><br><img src="${signature.image_url}" alt="Logo" style="max-height: 60px;" />`;
    }
    return sigContent;
  };

  const getDefaultSignatureId = () => {
    return signatures.find((s: any) => s.is_default)?.id || '';
  };

  const getEmailPreviewHtml = () => {
    const bodyHtml = (editedBody || '').replace(/\n/g, '<br>');
    if (!includeSignature) return bodyHtml;

    const signatureId = selectedSignatureId || getDefaultSignatureId();
    if (!signatureId) return bodyHtml;

    const signatureHtml = getSignatureContent(signatureId);
    if (!signatureHtml) return bodyHtml;

    return `${bodyHtml}<br><br>---<br>${signatureHtml}`;
  };

  const deleteDraft = async (draftId: string) => {
    if (!confirm('Are you sure you want to delete this draft? This action cannot be undone.')) {
      return;
    }

    const { error } = await supabase
      .from('email_drafts')
      .delete()
      .eq('id', draftId);

    if (error) {
      toast.error('Failed to delete draft');
    } else {
      toast.success('Draft deleted!');
      setDrafts((prev) => prev.filter((draft) => draft.id !== draftId));
      if (editingDraft?.id === draftId) {
        setEditingDraft(null);
      }
    }
  };

  const sendApprovedDrafts = async (contactId: string) => {
    if (!selectedSender) {
      toast.error('Please select a sender account');
      return;
    }

    const contactDrafts = drafts.filter(d => d.contact_id === contactId && d.status === 'approved');
    if (contactDrafts.length === 0) {
      toast.error('No approved drafts to send');
      return;
    }

    const firstDraft = contactDrafts.find(d => d.draft_type === 'first_outreach');
    if (!firstDraft) {
      toast.error('First outreach draft must be approved');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          draftId: firstDraft.id,
          senderAccountId: selectedSender,
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        // Try to extract error message
        const errorMessage = error.message || JSON.stringify(error);
        toast.error(`Failed to send email: ${errorMessage}`);
        return;
      }

      if (data?.error) {
        console.error('Function returned error:', data.error);
        toast.error(`Failed to send email: ${data.error}`);
        return;
      }

      toast.success('Email sent! Follow-ups will be scheduled automatically (4 days and 7 days).');
      fetchData();
    } catch (error) {
      console.error('Error sending email:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to send email: ${errorMessage}`);
    }
  };

  const sendAllApproved = async () => {
    if (!selectedSender) {
      toast.error('Please select a sender account');
      return;
    }

    const approvedFirstOutreach = drafts.filter(
      d => d.status === 'approved' && d.draft_type === 'first_outreach'
    );

    if (approvedFirstOutreach.length === 0) {
      toast.error('No approved first outreach drafts to send');
      return;
    }

    if (!confirm(`Send ${approvedFirstOutreach.length} approved emails? Follow-ups will be scheduled automatically.`)) {
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('send-all-approved', {
        body: {
          senderAccountId: selectedSender,
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        const errorMessage = error.message || JSON.stringify(error);
        toast.error(`Failed to send emails: ${errorMessage}`);
        return;
      }

      if (data?.error) {
        console.error('Function returned error:', data.error);
        toast.error(`Failed to send emails: ${data.error}`);
        return;
      }

      toast.success(data?.message || `Sent ${data?.sent || 0} emails! Follow-ups scheduled automatically.`);
      fetchData();
    } catch (error) {
      console.error('Error sending all approved emails:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to send emails: ${errorMessage}`);
    }
  };

  const getDraftTypeLabel = (type: string) => {
    switch (type) {
      case 'first_outreach': return '1st';
      case 'second_followup': return '2nd';
      case 'final_followup': return 'Final';
      default: return type;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { class: string; label: string }> = {
      draft: { class: 'bg-secondary text-secondary-foreground', label: 'Draft' },
      approved: { class: 'bg-green-500/20 text-green-400 border-green-500/30', label: 'Approved' },
      sent: { class: 'bg-primary/20 text-primary border-primary/30', label: 'Sent' },
      scheduled: { class: 'bg-blue-500/20 text-blue-400 border-blue-500/30', label: 'Scheduled' },
      failed: { class: 'bg-destructive/20 text-destructive border-destructive/30', label: 'Failed' },
    };
    const v = variants[status] || variants.draft;
    return <Badge className={v.class}>{v.label}</Badge>;
  };

  // Group drafts by contact
  const groupedDrafts = drafts.reduce((acc, draft) => {
    const contactId = draft.contact_id;
    if (!acc[contactId]) {
      acc[contactId] = {
        contact: draft.contact,
        drafts: [],
      };
    }
    acc[contactId].drafts.push(draft);
    return acc;
  }, {} as Record<string, { contact: Contact; drafts: DraftWithContact[] }>);

  const filteredGroups = Object.entries(groupedDrafts).filter(([_, group]) => {
    if (filterStatus === 'all' && filterType === 'all') return true;
    
    return group.drafts.some(d => {
      const statusMatch = filterStatus === 'all' || d.status === filterStatus;
      const typeMatch = filterType === 'all' || d.draft_type === filterType;
      return statusMatch && typeMatch;
    });
  });

  const toggleContact = (contactId: string) => {
    const newExpanded = new Set(expandedContacts);
    if (newExpanded.has(contactId)) {
      newExpanded.delete(contactId);
    } else {
      newExpanded.add(contactId);
    }
    setExpandedContacts(newExpanded);
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
                Review
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-semibold text-foreground tracking-tight">Email Drafts</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Review, edit, and approve AI-generated email drafts
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            {drafts.filter(d => d.status === 'approved' && d.draft_type === 'first_outreach').length > 0 && (
              <Button 
                variant="gold" 
                onClick={sendAllApproved}
                disabled={!selectedSender}
              >
                <Send className="w-4 h-4 mr-2" />
                Send All Approved ({drafts.filter(d => d.status === 'approved' && d.draft_type === 'first_outreach').length})
              </Button>
            )}
            <Button variant="outline" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Generation Controls */}
        <Card className="bg-card border-border">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4">
              <div className="flex-1 w-full sm:min-w-[200px]">
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Select Template
                </label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue placeholder="Choose a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 w-full sm:min-w-[200px]">
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Send From
                </label>
                <Select value={selectedSender} onValueChange={setSelectedSender}>
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue placeholder="Choose sender account" />
                  </SelectTrigger>
                  <SelectContent>
                    {senderAccounts.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.display_name || s.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                variant="gold" 
                onClick={generateDrafts}
                disabled={generating || !selectedTemplate}
              >
                {generating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                Generate Drafts with AI
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[140px] bg-input border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-[160px] bg-input border-border">
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

        {/* Drafts List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="bg-card border-border animate-pulse">
                <CardContent className="p-6 h-32" />
              </Card>
            ))}
          </div>
        ) : filteredGroups.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="p-12 text-center">
              <Mail className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No Drafts Yet</h3>
              <p className="text-muted-foreground mb-4">
                Upload contacts and select a template to generate personalized email drafts
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredGroups.map(([contactId, group]) => {
              const isExpanded = expandedContacts.has(contactId);
              const approvedCount = group.drafts.filter(d => d.status === 'approved').length;
              const allApproved = approvedCount === 3;

              return (
                <Card key={contactId} className="bg-card border-border overflow-hidden">
                  {/* Contact Header */}
                  <div 
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-secondary/30 transition-colors"
                    onClick={() => toggleContact(contactId)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-gradient-gold-subtle border border-primary/20 flex items-center justify-center">
                        <Mail className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {group.contact.name || group.contact.email}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {group.contact.company || 'Unknown Company'} • {group.contact.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                      <span className="text-sm text-muted-foreground">
                        {approvedCount}/3 approved
                      </span>
                      <div className="flex items-center gap-2">
                      {allApproved && (
                        <Button 
                          variant="gold" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            sendApprovedDrafts(contactId);
                          }}
                            className="text-xs sm:text-sm"
                        >
                          <Send className="w-4 h-4 mr-1" />
                          Send
                        </Button>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      )}
                      </div>
                    </div>
                  </div>

                  {/* Drafts */}
                  {isExpanded && (
                    <div className="border-t border-border divide-y divide-border">
                      {group.drafts
                        .sort((a, b) => {
                          const order = ['first_outreach', 'second_followup', 'final_followup'];
                          return order.indexOf(a.draft_type) - order.indexOf(b.draft_type);
                        })
                        .map((draft) => (
                          <div key={draft.id} className="p-4 bg-secondary/20">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="border-primary text-primary">
                                  {getDraftTypeLabel(draft.draft_type)}
                                </Badge>
                                {getStatusBadge(draft.status)}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => {
                                        setEditingDraft(draft);
                                        setEditedSubject(draft.edited_subject || draft.subject);
                                        setEditedBody(draft.edited_body || draft.body);
                                        const hasSignature = (draft as any).signature_id;
                                        const defaultSignatureId = signatures.find((s: any) => s.is_default)?.id || '';
                                        setIncludeSignature((draft as any).include_signature !== false);
                                        setSelectedSignatureId(hasSignature || defaultSignatureId);
                                      }}
                                    >
                                      <Edit className="w-4 h-4 mr-1" />
                                      Edit
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
                                    <DialogHeader>
                                      <DialogTitle className="text-foreground">Edit Draft</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4 mt-4 pr-2">
                                      <div>
                                        <label className="text-sm font-medium text-foreground mb-2 block">
                                          Subject
                                        </label>
                                        <Input
                                          value={editedSubject}
                                          onChange={(e) => setEditedSubject(e.target.value)}
                                          className="bg-input border-border"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium text-foreground mb-2 block">
                                          Body
                                        </label>
                                        <Textarea
                                          value={editedBody}
                                          onChange={(e) => setEditedBody(e.target.value)}
                                          className="min-h-[250px] max-h-[400px] bg-input border-border resize-y overflow-y-auto"
                                        />
                                      </div>
                                      <div className="space-y-4 p-4 bg-secondary/30 rounded-lg border border-border">
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2">
                                            <Pen className="w-4 h-4 text-muted-foreground" />
                                            <Label htmlFor="include-signature" className="text-sm font-medium text-foreground cursor-pointer">
                                              Include Email Signature
                                            </Label>
                                          </div>
                                          <Switch
                                            id="include-signature"
                                            checked={includeSignature}
                                            onCheckedChange={setIncludeSignature}
                                          />
                                        </div>
                                        {includeSignature && (
                                          <>
                                            {signatures.length === 0 ? (
                                              <div className="p-4 bg-background rounded border border-border">
                                                <p className="text-sm text-muted-foreground mb-3">
                                                  No signatures created yet. Create a signature first to use it in emails.
                                                </p>
                                                <Button
                                                  variant="outline"
                                                  size="sm"
                                                  onClick={() => {
                                                    window.open('/signatures', '_blank');
                                                  }}
                                                >
                                                  <Pen className="w-4 h-4 mr-2" />
                                                  Go to Signatures Page
                                                </Button>
                                              </div>
                                            ) : (
                                              <div>
                                                <Label className="text-sm font-medium text-foreground mb-2 block">
                                                  Select Signature
                                                </Label>
                                                <Select value={selectedSignatureId} onValueChange={setSelectedSignatureId}>
                                                  <SelectTrigger className="bg-input border-border">
                                                    <SelectValue placeholder="Select signature" />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                    {signatures.map((sig: any) => (
                                                      <SelectItem key={sig.id} value={sig.id}>
                                                        {sig.name} {sig.is_default && '(Default)'}
                                                      </SelectItem>
                                                    ))}
                                                  </SelectContent>
                                                </Select>
                                                {!selectedSignatureId && getDefaultSignatureId() && (
                                                  <p className="text-xs text-muted-foreground mt-2">
                                                    Default signature will be used automatically.
                                                  </p>
                                                )}
                                                {selectedSignatureId && (
                                                  <div className="mt-3 p-3 bg-background rounded border border-border max-h-[200px] overflow-y-auto">
                                                    <p className="text-xs text-muted-foreground mb-2">Preview:</p>
                                                    <div 
                                                      className="prose prose-sm max-w-none text-foreground"
                                                      dangerouslySetInnerHTML={{ 
                                                        __html: getSignatureContent(selectedSignatureId) 
                                                      }}
                                                    />
                                                  </div>
                                                )}
                                                <p className="text-xs text-muted-foreground mt-2">
                                                  Don't have a signature?{' '}
                                                  <button
                                                    type="button"
                                                    onClick={() => window.open('/signatures', '_blank')}
                                                    className="text-primary hover:underline"
                                                  >
                                                    Create one here
                                                  </button>
                                                </p>
                                              </div>
                                            )}
                                          </>
                                        )}
                                      </div>
                                      <div className="p-4 bg-background rounded-lg border border-border">
                                        <p className="text-sm font-medium text-foreground mb-2">Email Preview</p>
                                        <div
                                          className="prose prose-sm max-w-none text-foreground max-h-[240px] overflow-y-auto pr-2"
                                          dangerouslySetInnerHTML={{ __html: getEmailPreviewHtml() }}
                                        />
                                      </div>
                                      <div className="flex gap-3">
                                        <Button variant="gold" onClick={saveDraftEdit}>
                                          Save Changes
                                        </Button>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                                {draft.status === 'draft' && (
                                  <Button 
                                    variant="gold" 
                                    size="sm"
                                    onClick={() => approveDraft(draft)}
                                  >
                                    <Check className="w-4 h-4 mr-1" />
                                    Approve
                                  </Button>
                                )}
                                <Button 
                                  variant="destructive" 
                                  size="sm"
                                  onClick={() => deleteDraft(draft.id)}
                                >
                                  <Trash2 className="w-4 h-4 mr-1" />
                                  Delete
                                </Button>
                              </div>
                            </div>
                            <div className="bg-background rounded-lg p-4 border border-border">
                              <p className="font-medium text-foreground mb-2">
                                {draft.edited_subject || draft.subject}
                              </p>
                              <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto pr-2">
                                {draft.edited_body || draft.body}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
