import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { EmailTemplate } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Save, Trash2, FileText, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function Templates() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [newTemplate, setNewTemplate] = useState({ name: '', template_content: '' });
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setTemplates(data as EmailTemplate[]);
      if (data.length > 0 && !selectedTemplate) {
        setSelectedTemplate(data[0] as EmailTemplate);
      }
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!selectedTemplate) return;
    
    setSaving(true);
    const { error } = await supabase
      .from('email_templates')
      .update({
        name: selectedTemplate.name,
        template_content: selectedTemplate.template_content,
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedTemplate.id);

    if (error) {
      toast.error('Failed to save template');
    } else {
      toast.success('Template saved successfully');
      fetchTemplates();
    }
    setSaving(false);
  };

  const handleCreate = async () => {
    if (!newTemplate.name || !newTemplate.template_content) {
      toast.error('Please fill in all fields');
      return;
    }

    setSaving(true);
    const { data, error } = await supabase
      .from('email_templates')
      .insert([newTemplate])
      .select()
      .single();

    if (error) {
      toast.error('Failed to create template');
    } else {
      toast.success('Template created successfully');
      setTemplates([data as EmailTemplate, ...templates]);
      setSelectedTemplate(data as EmailTemplate);
      setNewTemplate({ name: '', template_content: '' });
      setIsCreating(false);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('email_templates')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete template');
    } else {
      toast.success('Template deleted');
      setTemplates(templates.filter(t => t.id !== id));
      if (selectedTemplate?.id === id) {
        setSelectedTemplate(templates[0] || null);
      }
    }
  };

  return (
    <MainLayout>
      <div className="space-y-8 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold font-serif text-gradient-gold">Email Templates</h1>
            <p className="text-muted-foreground mt-2">
              Create and manage your email templates for personalized outreach
            </p>
          </div>
          <Button 
            variant="gold" 
            onClick={() => setIsCreating(true)}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            New Template
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Template List */}
          <div className="space-y-3">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-card rounded-lg animate-pulse" />
                ))}
              </div>
            ) : templates.length === 0 ? (
              <Card className="bg-card border-border">
                <CardContent className="p-6 text-center">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">No templates yet</p>
                </CardContent>
              </Card>
            ) : (
              templates.map((template) => (
                <Card 
                  key={template.id}
                  className={`cursor-pointer transition-all duration-200 hover:border-primary/50 ${
                    selectedTemplate?.id === template.id 
                      ? 'border-primary bg-gradient-gold-subtle' 
                      : 'bg-card border-border'
                  }`}
                  onClick={() => {
                    setSelectedTemplate(template);
                    setIsCreating(false);
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{template.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(template.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(template.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Template Editor */}
          <div className="lg:col-span-3">
            <Card className="bg-card border-border">
              <CardHeader className="border-b border-border">
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Sparkles className="w-5 h-5 text-primary" />
                  {isCreating ? 'Create New Template' : 'Edit Template'}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {isCreating ? (
                  <>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Template Name
                      </label>
                      <Input
                        value={newTemplate.name}
                        onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                        placeholder="e.g., Investor First Outreach"
                        className="bg-input border-border"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Template Content
                      </label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Use placeholders like {'{name}'}, {'{company}'}, {'{role}'} for personalization
                      </p>
                      <Textarea
                        value={newTemplate.template_content}
                        onChange={(e) => setNewTemplate({ ...newTemplate, template_content: e.target.value })}
                        placeholder="Dear {name},&#10;&#10;I'm reaching out regarding..."
                        className="min-h-[400px] bg-input border-border font-mono text-sm"
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button 
                        variant="gold" 
                        onClick={handleCreate}
                        disabled={saving}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {saving ? 'Creating...' : 'Create Template'}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setIsCreating(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </>
                ) : selectedTemplate ? (
                  <>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Template Name
                      </label>
                      <Input
                        value={selectedTemplate.name}
                        onChange={(e) => setSelectedTemplate({ ...selectedTemplate, name: e.target.value })}
                        className="bg-input border-border"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        Template Content
                      </label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Use placeholders like {'{name}'}, {'{company}'}, {'{role}'} for personalization
                      </p>
                      <Textarea
                        value={selectedTemplate.template_content}
                        onChange={(e) => setSelectedTemplate({ ...selectedTemplate, template_content: e.target.value })}
                        className="min-h-[400px] bg-input border-border font-mono text-sm"
                      />
                    </div>
                    <Button 
                      variant="gold" 
                      onClick={handleSave}
                      disabled={saving}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Select a template or create a new one</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
