import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Pen, 
  Trash2, 
  Plus, 
  Image as ImageIcon,
  Check,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

interface EmailSignature {
  id: string;
  name: string;
  content: string;
  image_url: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export default function EmailSignatures() {
  const [signatures, setSignatures] = useState<EmailSignature[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSignature, setEditingSignature] = useState<EmailSignature | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    content: '',
    image_url: '',
    is_default: false,
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchSignatures();
  }, []);

  const fetchSignatures = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('email_signatures')
      .select('*')
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (!error && data) {
      setSignatures(data as EmailSignature[]);
    }
    setLoading(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    setUploading(true);
    try {
      // Convert to base64 for storage (in production, use Supabase Storage)
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setFormData({ ...formData, image_url: base64String });
        toast.success('Image uploaded successfully');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a signature name');
      return;
    }

    if (!formData.content.trim()) {
      toast.error('Please enter signature content');
      return;
    }

    try {
      // If setting as default, unset other defaults first
      if (formData.is_default) {
        // First check if there are any existing signatures
        const { data: existingSigs } = await supabase
          .from('email_signatures')
          .select('id')
          .eq('is_default', true);
        
        if (existingSigs && existingSigs.length > 0) {
          // Only update if there are existing signatures and it's not the current one being edited
          const otherDefaults = existingSigs.filter(sig => sig.id !== editingSignature?.id);
          if (otherDefaults.length > 0) {
            await supabase
              .from('email_signatures')
              .update({ is_default: false })
              .in('id', otherDefaults.map(s => s.id));
          }
        }
      }

      if (editingSignature) {
        // Update existing
        const { error } = await supabase
          .from('email_signatures')
          .update({
            name: formData.name,
            content: formData.content,
            image_url: formData.image_url || null,
            is_default: formData.is_default,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingSignature.id);

        if (error) throw error;
        toast.success('Signature updated!');
      } else {
        // Create new
        const { error } = await supabase
          .from('email_signatures')
          .insert({
            name: formData.name,
            content: formData.content,
            image_url: formData.image_url || null,
            is_default: formData.is_default,
          });

        if (error) throw error;
        toast.success('Signature created!');
      }

      setIsDialogOpen(false);
      setEditingSignature(null);
      setFormData({ name: '', content: '', image_url: '', is_default: false });
      fetchSignatures();
    } catch (error: any) {
      console.error('Error saving signature:', error);
      const errorMessage = error?.message || error?.error?.message || 'Failed to save signature';
      
      // Check if table doesn't exist
      if (errorMessage.includes('404') || errorMessage.includes('does not exist') || errorMessage.includes('relation') || error?.code === 'PGRST116') {
        toast.error('Database table not found. Please run the migration SQL script first. Check SETUP_EMAIL_SIGNATURES.sql file.');
      } else {
        toast.error(`Failed to save signature: ${errorMessage}`);
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this signature?')) {
      return;
    }

    const { error } = await supabase
      .from('email_signatures')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete signature');
    } else {
      toast.success('Signature deleted!');
      fetchSignatures();
    }
  };

  const handleEdit = (signature: EmailSignature) => {
    setEditingSignature(signature);
    setFormData({
      name: signature.name,
      content: signature.content,
      image_url: signature.image_url || '',
      is_default: signature.is_default,
    });
    setIsDialogOpen(true);
  };

  const handleNew = () => {
    setEditingSignature(null);
    setFormData({ name: '', content: '', image_url: '', is_default: false });
    setIsDialogOpen(true);
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Pen className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
                Manage
              </span>
            </div>
            <h1 className="text-3xl font-serif font-semibold text-foreground tracking-tight">
              Email Signatures
            </h1>
            <p className="text-muted-foreground mt-1">
              Create and manage email signatures with logos. These are separate from Outlook signatures and will be automatically added to your emails when enabled.
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="gold" onClick={handleNew}>
                <Plus className="w-4 h-4 mr-2" />
                New Signature
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-card border-border max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-foreground">
                  {editingSignature ? 'Edit Signature' : 'New Signature'}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  {editingSignature ? 'Update your email signature' : 'Create a new email signature with logo and HTML content'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="name" className="text-foreground">Signature Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Samaveda Capital Signature"
                    className="bg-input border-border mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="content" className="text-foreground">Signature Content (HTML)</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder={`Example:\n\nBest Regards,<br>\nSamaveda Capital,<br>\n<a href="https://samavedacapital.com/">🌐 samavedacapital.com</a>`}
                    className="min-h-[200px] bg-input border-border mt-2 font-mono text-sm"
                  />
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-muted-foreground">
                      Use HTML to format your signature. Write your text content here (name, company, links, etc.).
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <strong>Links:</strong> Use {'<a href="URL">Link Text</a>'} for clickable links. Example: {'<a href="https://samavedacapital.com/">🌐 samavedacapital.com</a>'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <strong>Note:</strong> The logo/image you upload below will be automatically added at the bottom of your signature when emails are sent.
                    </p>
                  </div>
                </div>
                <div>
                  <Label htmlFor="image" className="text-foreground">Logo/Image (Optional - Always appears at bottom)</Label>
                  <div className="mt-2">
                    <Input
                      id="image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="bg-input border-border"
                      disabled={uploading}
                    />
                    {formData.image_url && (
                      <div className="mt-2">
                        <p className="text-xs text-muted-foreground mb-2">Preview (will appear at bottom of signature):</p>
                        <img 
                          src={formData.image_url} 
                          alt="Signature preview" 
                          className="max-h-32 object-contain border border-border rounded p-2 bg-background"
                        />
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      <strong>Important:</strong> The logo/image will always be placed at the bottom of your signature, even if you don't include it in the HTML content above.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_default"
                    checked={formData.is_default}
                    onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="is_default" className="text-foreground cursor-pointer">
                    Set as default signature
                  </Label>
                </div>
                <div className="flex gap-3">
                  <Button variant="gold" onClick={handleSave} className="flex-1">
                    {editingSignature ? 'Update' : 'Create'} Signature
                  </Button>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Loading signatures...</p>
          </div>
        ) : signatures.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="p-12 text-center">
              <Pen className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No Signatures Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first email signature to get started
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {signatures.map((signature) => (
              <Card key={signature.id} className="bg-card border-border">
                <CardHeader className="border-b border-border">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-foreground flex items-center gap-2">
                        {signature.name}
                        {signature.is_default && (
                          <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
                            Default
                          </Badge>
                        )}
                      </CardTitle>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(signature)}
                        className="h-8 w-8"
                      >
                        <Pen className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(signature.id)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div 
                    className="prose prose-sm max-w-none text-foreground"
                    dangerouslySetInnerHTML={{ 
                      __html: (() => {
                        let sigContent = signature.content;
                        if (signature.image_url) {
                          sigContent = `${sigContent}<br><br><img src="${signature.image_url}" alt="Logo" style="max-height: 60px;" />`;
                        }
                        return sigContent;
                      })()
                    }}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
