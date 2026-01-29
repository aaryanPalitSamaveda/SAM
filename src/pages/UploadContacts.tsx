import { useState, useCallback, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileSpreadsheet, Sparkles, ChevronRight, Loader2, CheckCircle2, Clock, FileText, Eye, Send, Users, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ColumnMapping {
  name: string;
  email: string;
  company: string;
}

interface ContactWithDrafts {
  id: string;
  name: string | null;
  email: string;
  company: string | null;
  created_at: string;
  drafts: {
    id: string;
    draft_type: string;
    status: string | null;
    subject: string;
  }[];
}

const NONE_VALUE = "__none__";

export default function UploadContacts() {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({ name: '', email: '', company: '' });
  const [step, setStep] = useState<'upload' | 'mapping' | 'processing' | 'done'>('upload');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  
  // Contact management state
  const [contacts, setContacts] = useState<ContactWithDrafts[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [generatingDrafts, setGeneratingDrafts] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'manage'>('upload');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter only non-empty headers for Select options
  const validHeaders = headers.filter(h => h && h.trim() !== '');

  const loadContacts = useCallback(async () => {
    setLoadingContacts(true);
    try {
      // Load contacts with their draft status
      const { data: contactsData, error } = await supabase
        .from('contacts')
        .select(`
          id,
          name,
          email,
          company,
          created_at
        `)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      // Load drafts for all contacts
      const contactIds = contactsData?.map(c => c.id) || [];
      const { data: draftsData, error: draftsError } = await supabase
        .from('email_drafts')
        .select('id, contact_id, draft_type, status, subject')
        .in('contact_id', contactIds);

      if (draftsError) throw draftsError;

      // Merge contacts with their drafts
      const contactsWithDrafts: ContactWithDrafts[] = (contactsData || []).map(contact => ({
        ...contact,
        drafts: (draftsData || []).filter(d => d.contact_id === contact.id)
      }));

      setContacts(contactsWithDrafts);
    } catch (error) {
      console.error('Error loading contacts:', error);
      toast.error('Failed to load contacts');
    } finally {
      setLoadingContacts(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'manage') {
      loadContacts();
    }
  }, [activeTab, loadContacts]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        if (jsonData.length < 2) {
          toast.error('File must contain headers and at least one row of data');
          return;
        }

        // Filter out empty headers and ensure all are strings
        const headerRow = (jsonData[0] as any[])
          .map((h, index) => (h && String(h).trim()) || `Column_${index + 1}`)
          .filter(h => h);
        
        const dataRows = jsonData.slice(1).map((row) => {
          const obj: Record<string, any> = {};
          headerRow.forEach((header, index) => {
            obj[header] = row[index] || '';
          });
          return obj;
        }).filter((row) => Object.values(row).some(v => v)); // Filter empty rows

        setHeaders(headerRow);
        setRows(dataRows);
        setStep('mapping');

        // Auto-detect columns
        const emailCol = headerRow.find(h => 
          h.toLowerCase().includes('email') || h.toLowerCase().includes('mail')
        );
        const nameCol = headerRow.find(h => 
          h.toLowerCase().includes('name') && !h.toLowerCase().includes('company')
        );
        const companyCol = headerRow.find(h => 
          h.toLowerCase().includes('company') || h.toLowerCase().includes('organization') || h.toLowerCase().includes('firm')
        );

        setColumnMapping({
          name: nameCol || '',
          email: emailCol || '',
          company: companyCol || '',
        });

        toast.success(`Loaded ${dataRows.length} contacts`);
      } catch (error) {
        console.error('Error parsing file:', error);
        toast.error('Failed to parse file. Please ensure it\'s a valid CSV or Excel file.');
      }
    };

    reader.readAsBinaryString(uploadedFile);
  }, []);

  const handleProcessContacts = async () => {
    if (!columnMapping.email) {
      toast.error('Please map the email column');
      return;
    }

    setStep('processing');
    setProcessing(true);
    setProgress({ current: 0, total: rows.length });

    try {
      // Step 1: Remove duplicates within the uploaded file (by email)
      const emailMap = new Map<string, Record<string, any>>();
      rows.forEach((row) => {
        const email = row[columnMapping.email]?.toString().toLowerCase().trim();
        if (email && !emailMap.has(email)) {
          emailMap.set(email, row);
        }
      });
      const uniqueRows = Array.from(emailMap.values());
      const duplicatesInFile = rows.length - uniqueRows.length;

      // Step 2: Check for existing emails in the database
      const emailsToCheck = Array.from(emailMap.keys());

      // Ignore reply-tracking auto-contacts when checking duplicates
      const { data: replyBatchRows } = await supabase
        .from('upload_batches')
        .select('id')
        .eq('file_name', 'reply-tracking');
      const replyBatchIds = new Set((replyBatchRows || []).map((row) => row.id));

      const { data: existingContacts, error: checkError } = await supabase
        .from('contacts')
        .select('email, upload_batch_id')
        .in('email', emailsToCheck);

      if (checkError) throw checkError;

      const existingEmails = new Set(
        (existingContacts || [])
          .filter((c) => !replyBatchIds.has(c.upload_batch_id))
          .map((c) => c.email.toLowerCase().trim())
      );
      
      // Filter out contacts that already exist
      const newRows = uniqueRows.filter((row) => {
        const email = row[columnMapping.email]?.toString().toLowerCase().trim();
        return !existingEmails.has(email);
      });

      const duplicatesInDb = uniqueRows.length - newRows.length;

      if (newRows.length === 0) {
        toast.warning(`All ${rows.length} contacts already exist in the database`);
        setStep('mapping');
        setProcessing(false);
        return;
      }

      // Create upload batch
      const { data: batch, error: batchError } = await supabase
        .from('upload_batches')
        .insert([{
          file_name: file?.name || 'Unknown',
          column_mapping: columnMapping as any,
          total_contacts: newRows.length,
          status: 'processing',
        }])
        .select()
        .single();

      if (batchError) throw batchError;

      // Insert contacts
      const contactsToInsert = newRows.map((row) => ({
        upload_batch_id: batch.id,
        raw_data: row,
        name: columnMapping.name && columnMapping.name !== NONE_VALUE ? row[columnMapping.name] : null,
        email: row[columnMapping.email],
        company: columnMapping.company && columnMapping.company !== NONE_VALUE ? row[columnMapping.company] : null,
      }));

      // Insert in batches of 50
      const batchSize = 50;
      for (let i = 0; i < contactsToInsert.length; i += batchSize) {
        const contactBatch = contactsToInsert.slice(i, i + batchSize);
        const { error: insertError } = await supabase
          .from('contacts')
          .insert(contactBatch);

        if (insertError) throw insertError;

        setProgress({ current: Math.min(i + batchSize, contactsToInsert.length), total: newRows.length });
      }

      // Update batch status
      await supabase
        .from('upload_batches')
        .update({ 
          status: 'completed', 
          processed_contacts: contactsToInsert.length 
        })
        .eq('id', batch.id);

      setStep('done');
      
      // Build success message with duplicate info
      let message = `Successfully imported ${contactsToInsert.length} contacts!`;
      if (duplicatesInFile > 0 || duplicatesInDb > 0) {
        const skipped = [];
        if (duplicatesInFile > 0) skipped.push(`${duplicatesInFile} duplicates in file`);
        if (duplicatesInDb > 0) skipped.push(`${duplicatesInDb} already in database`);
        message += ` Skipped: ${skipped.join(', ')}.`;
      }
      toast.success(message);
    } catch (error) {
      console.error('Error processing contacts:', error);
      toast.error('Failed to process contacts');
      setStep('mapping');
    } finally {
      setProcessing(false);
    }
  };

  const resetUpload = () => {
    setFile(null);
    setHeaders([]);
    setRows([]);
    setColumnMapping({ name: '', email: '', company: '' });
    setStep('upload');
    setProgress({ current: 0, total: 0 });
  };

  const handleGenerateDrafts = async (contactIds: string[]) => {
    if (contactIds.length === 0) {
      toast.error('Please select contacts to generate drafts for');
      return;
    }

    setGeneratingDrafts(true);
    
    try {
      // Get selected contacts
      const selectedContactsData = contacts.filter(c => contactIds.includes(c.id));
      
      // Get template
      const { data: template } = await supabase
        .from('email_templates')
        .select('template_content')
        .eq('is_active', true)
        .limit(1)
        .single();

      if (!template) {
        toast.error('No active template found. Please create a template first.');
        setGeneratingDrafts(false);
        return;
      }

      // Call the generate-drafts edge function
      const { data, error } = await supabase.functions.invoke('generate-drafts', {
        body: {
          contacts: selectedContactsData.map(c => ({
            id: c.id,
            name: c.name,
            email: c.email,
            company: c.company
          })),
          template: template.template_content
        }
      });

      if (error) throw error;

      toast.success(`Generated drafts for ${contactIds.length} contacts`);
      setSelectedContacts([]);
      loadContacts();
    } catch (error) {
      console.error('Error generating drafts:', error);
      toast.error('Failed to generate drafts');
    } finally {
      setGeneratingDrafts(false);
    }
  };

  const getDraftStatus = (contact: ContactWithDrafts) => {
    if (contact.drafts.length === 0) {
      return { status: 'pending', label: 'No Drafts', variant: 'secondary' as const };
    }
    
    const allApproved = contact.drafts.every(d => d.status === 'approved');
    const allSent = contact.drafts.every(d => d.status === 'sent');
    const hasDrafts = contact.drafts.some(d => d.status === 'draft');
    
    if (allSent) return { status: 'sent', label: 'All Sent', variant: 'success' as const };
    if (allApproved) return { status: 'approved', label: 'Ready to Send', variant: 'gold' as const };
    if (hasDrafts) return { status: 'draft', label: `${contact.drafts.length} Drafts`, variant: 'warning' as const };
    
    return { status: 'partial', label: 'In Progress', variant: 'default' as const };
  };

  const filteredContacts = contacts.filter((contact) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (contact.name || '').toLowerCase().includes(q) ||
      contact.email.toLowerCase().includes(q) ||
      (contact.company || '').toLowerCase().includes(q)
    );
  });

  const pendingContacts = filteredContacts.filter(c => c.drafts.length === 0);
  const draftContacts = filteredContacts.filter(c => c.drafts.length > 0 && c.drafts.some(d => d.status === 'draft'));
  const readyContacts = filteredContacts.filter(c => c.drafts.every(d => d.status === 'approved') && c.drafts.length > 0);
  const sentContacts = filteredContacts.filter(c => c.drafts.every(d => d.status === 'sent') && c.drafts.length > 0);

  const deleteContact = async (contactId: string) => {
    if (!confirm('Delete this contact and all associated drafts? This cannot be undone.')) {
      return;
    }

    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', contactId);

    if (error) {
      toast.error('Failed to delete contact');
      return;
    }

    toast.success('Contact deleted');
    setContacts((prev) => prev.filter((contact) => contact.id !== contactId));
    setSelectedContacts((prev) => prev.filter((id) => id !== contactId));
  };

  const handleSelectAll = (contactList: ContactWithDrafts[]) => {
    const allSelected = contactList.every(c => selectedContacts.includes(c.id));
    if (allSelected) {
      setSelectedContacts(selectedContacts.filter(id => !contactList.map(c => c.id).includes(id)));
    } else {
      setSelectedContacts([...new Set([...selectedContacts, ...contactList.map(c => c.id)])]);
    }
  };

  const handleMappingValueChange = (field: keyof ColumnMapping, value: string) => {
    setColumnMapping({ 
      ...columnMapping, 
      [field]: value === NONE_VALUE ? '' : value 
    });
  };

  return (
    <MainLayout>
      <div className="space-y-8 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-primary font-medium mb-2">
              <Users className="w-4 h-4" />
              Contact Management
            </div>
            <h1 className="text-4xl font-bold font-serif text-foreground tracking-tight">
              Upload & Manage Contacts
            </h1>
            <p className="text-muted-foreground mt-2">
              Import investor contacts and manage their email drafts
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'upload' | 'manage')}>
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="upload" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Upload className="w-4 h-4 mr-2" />
              Upload Contacts
            </TabsTrigger>
            <TabsTrigger value="manage" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <FileText className="w-4 h-4 mr-2" />
              Manage Drafts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="mt-6">
            {/* Progress Steps */}
            <div className="flex items-center justify-center gap-4 mb-8">
              {['upload', 'mapping', 'processing', 'done'].map((s, i) => (
                <div key={s} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    step === s 
                      ? 'bg-primary text-primary-foreground' 
                      : ['upload', 'mapping', 'processing', 'done'].indexOf(step) > i
                        ? 'bg-primary/50 text-primary-foreground'
                        : 'bg-secondary text-muted-foreground'
                  }`}>
                    {i + 1}
                  </div>
                  {i < 3 && (
                    <ChevronRight className="w-4 h-4 mx-2 text-muted-foreground" />
                  )}
                </div>
              ))}
            </div>

            {/* Upload Step */}
            {step === 'upload' && (
              <Card className="bg-card border-border max-w-2xl mx-auto">
                <CardContent className="p-8">
                  <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 hover:bg-secondary/30 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <FileSpreadsheet className="w-16 h-16 text-primary mb-4" />
                      <p className="mb-2 text-lg font-medium text-foreground">
                        <span className="text-primary">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-sm text-muted-foreground">CSV or Excel files (.csv, .xlsx, .xls)</p>
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileUpload}
                    />
                  </label>
                </CardContent>
              </Card>
            )}

            {/* Mapping Step */}
            {step === 'mapping' && (
              <Card className="bg-card border-border max-w-2xl mx-auto">
                <CardHeader className="border-b border-border">
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Map Your Columns
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <p className="text-sm text-muted-foreground">
                    Found <span className="text-primary font-medium">{rows.length}</span> contacts in{' '}
                    <span className="text-foreground font-medium">{file?.name}</span>
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Email Column <span className="text-destructive">*</span>
                      </label>
                      <Select 
                        value={columnMapping.email || undefined} 
                        onValueChange={(v) => handleMappingValueChange('email', v)}
                      >
                        <SelectTrigger className="bg-input border-border">
                          <SelectValue placeholder="Select email column" />
                        </SelectTrigger>
                        <SelectContent>
                          {validHeaders.map((h) => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Name Column
                      </label>
                      <Select 
                        value={columnMapping.name || NONE_VALUE} 
                        onValueChange={(v) => handleMappingValueChange('name', v)}
                      >
                        <SelectTrigger className="bg-input border-border">
                          <SelectValue placeholder="Select name column" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE_VALUE}>None</SelectItem>
                          {validHeaders.map((h) => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Company Column
                      </label>
                      <Select 
                        value={columnMapping.company || NONE_VALUE} 
                        onValueChange={(v) => handleMappingValueChange('company', v)}
                      >
                        <SelectTrigger className="bg-input border-border">
                          <SelectValue placeholder="Select company column" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE_VALUE}>None</SelectItem>
                          {validHeaders.map((h) => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Preview */}
                  <div>
                    <p className="text-sm font-medium text-foreground mb-2">Preview (First 3 rows)</p>
                    <div className="rounded-lg border border-border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-secondary">
                          <tr>
                            <th className="px-4 py-2 text-left text-foreground">Name</th>
                            <th className="px-4 py-2 text-left text-foreground">Email</th>
                            <th className="px-4 py-2 text-left text-foreground">Company</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.slice(0, 3).map((row, i) => (
                            <tr key={i} className="border-t border-border">
                              <td className="px-4 py-2 text-muted-foreground">
                                {columnMapping.name && columnMapping.name !== NONE_VALUE ? row[columnMapping.name] : '-'}
                              </td>
                              <td className="px-4 py-2 text-muted-foreground">
                                {columnMapping.email ? row[columnMapping.email] : '-'}
                              </td>
                              <td className="px-4 py-2 text-muted-foreground">
                                {columnMapping.company && columnMapping.company !== NONE_VALUE ? row[columnMapping.company] : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button 
                      variant="gold" 
                      onClick={handleProcessContacts}
                      disabled={!columnMapping.email}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Import {rows.length} Contacts
                    </Button>
                    <Button variant="outline" onClick={resetUpload}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Processing Step */}
            {step === 'processing' && (
              <Card className="bg-card border-border max-w-2xl mx-auto">
                <CardContent className="p-8 text-center">
                  <Loader2 className="w-16 h-16 text-primary mx-auto mb-4 animate-spin" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">Processing Contacts</h3>
                  <p className="text-muted-foreground mb-4">
                    Importing {progress.current} of {progress.total} contacts...
                  </p>
                  <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-amber-500 to-amber-600 h-full transition-all duration-300"
                      style={{ width: `${(progress.current / progress.total) * 100}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Done Step */}
            {step === 'done' && (
              <Card className="bg-card border-border max-w-2xl mx-auto">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-gold flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Import Complete!</h3>
                  <p className="text-muted-foreground mb-6">
                    Successfully imported {progress.total} contacts. You can now generate email drafts.
                  </p>
                  <div className="flex gap-3 justify-center">
                    <Button variant="gold" onClick={() => setActiveTab('manage')}>
                      <FileText className="w-4 h-4 mr-2" />
                      Manage Drafts
                    </Button>
                    <Button variant="outline" onClick={resetUpload}>
                      Upload More
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="manage" className="mt-6 space-y-6">
            {loadingContacts ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            ) : (
              <>
                <Card className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="relative max-w-md">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search contacts by name, email, or company"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-input border-border"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="bg-card border-border">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                          <Clock className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-foreground">{pendingContacts.length}</p>
                          <p className="text-xs text-muted-foreground">Pending Drafts</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-card border-border">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-amber-500" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-foreground">{draftContacts.length}</p>
                          <p className="text-xs text-muted-foreground">To Review</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-card border-border">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <CheckCircle2 className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-foreground">{readyContacts.length}</p>
                          <p className="text-xs text-muted-foreground">Ready to Send</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-card border-border">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                          <Send className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-foreground">{sentContacts.length}</p>
                          <p className="text-xs text-muted-foreground">Emails Sent</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Action Bar */}
                {selectedContacts.length > 0 && (
                  <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-4 flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">
                        {selectedContacts.length} contact{selectedContacts.length > 1 ? 's' : ''} selected
                      </p>
                      <div className="flex gap-2">
                        <Button 
                          variant="gold" 
                          size="sm" 
                          onClick={() => handleGenerateDrafts(selectedContacts)}
                          disabled={generatingDrafts}
                        >
                          {generatingDrafts ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Sparkles className="w-4 h-4 mr-2" />
                          )}
                          Generate Drafts
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setSelectedContacts([])}>
                          Clear Selection
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Pending Contacts Section */}
                {pendingContacts.length > 0 && (
                  <Card className="bg-card border-border">
                    <CardHeader className="border-b border-border">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-foreground text-lg">
                          <Clock className="w-5 h-5 text-muted-foreground" />
                          Pending - No Drafts Generated ({pendingContacts.length})
                        </CardTitle>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleSelectAll(pendingContacts)}
                        >
                          {pendingContacts.every(c => selectedContacts.includes(c.id)) ? 'Deselect All' : 'Select All'}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y divide-border max-h-64 overflow-y-auto">
                        {pendingContacts.slice(0, 20).map((contact) => (
                          <div 
                            key={contact.id} 
                            className={`flex items-center justify-between p-4 hover:bg-secondary/30 cursor-pointer transition-colors ${
                              selectedContacts.includes(contact.id) ? 'bg-primary/5' : ''
                            }`}
                            onClick={() => {
                              if (selectedContacts.includes(contact.id)) {
                                setSelectedContacts(selectedContacts.filter(id => id !== contact.id));
                              } else {
                                setSelectedContacts([...selectedContacts, contact.id]);
                              }
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <input 
                                type="checkbox" 
                                checked={selectedContacts.includes(contact.id)}
                                onChange={() => {}}
                                className="rounded border-border"
                              />
                              <div>
                                <p className="font-medium text-foreground">{contact.name || 'Unknown'}</p>
                                <p className="text-sm text-muted-foreground">{contact.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {contact.company && (
                                <span className="text-xs text-muted-foreground">{contact.company}</span>
                              )}
                              <Badge variant="secondary">No Drafts</Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  deleteContact(contact.id);
                                }}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        {pendingContacts.length > 20 && (
                          <div className="p-4 text-center text-sm text-muted-foreground">
                            And {pendingContacts.length - 20} more...
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Drafts to Review Section */}
                {draftContacts.length > 0 && (
                  <Card className="bg-card border-border">
                    <CardHeader className="border-b border-border">
                      <CardTitle className="flex items-center gap-2 text-foreground text-lg">
                        <FileText className="w-5 h-5 text-amber-500" />
                        To Review - Drafts Generated ({draftContacts.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y divide-border max-h-64 overflow-y-auto">
                        {draftContacts.map((contact) => {
                          const status = getDraftStatus(contact);
                          return (
                            <div key={contact.id} className="flex items-center justify-between p-4 hover:bg-secondary/30">
                              <div>
                                <p className="font-medium text-foreground">{contact.name || 'Unknown'}</p>
                                <p className="text-sm text-muted-foreground">{contact.email}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={status.variant}>{status.label}</Badge>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => window.location.href = '/drafts'}
                                >
                                  <Eye className="w-4 h-4 mr-1" />
                                  Review
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteContact(contact.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Ready to Send Section */}
                {readyContacts.length > 0 && (
                  <Card className="bg-card border-border">
                    <CardHeader className="border-b border-border">
                      <CardTitle className="flex items-center gap-2 text-foreground text-lg">
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                        Ready to Send ({readyContacts.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y divide-border max-h-64 overflow-y-auto">
                        {readyContacts.map((contact) => (
                          <div key={contact.id} className="flex items-center justify-between p-4 hover:bg-secondary/30">
                            <div>
                              <p className="font-medium text-foreground">{contact.name || 'Unknown'}</p>
                              <p className="text-sm text-muted-foreground">{contact.email}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="gold">Approved</Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteContact(contact.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {contacts.length === 0 && (
                  <Card className="bg-card border-border">
                    <CardContent className="p-12 text-center">
                      <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">No Contacts Yet</h3>
                      <p className="text-muted-foreground mb-4">
                        Upload a CSV or Excel file to get started
                      </p>
                      <Button variant="gold" onClick={() => setActiveTab('upload')}>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Contacts
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
