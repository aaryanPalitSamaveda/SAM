import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
import { Plus, Users, Trash2, Edit, Eye, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import type { ContactList, Contact } from '@/types/database';

export default function ContactLists() {
  const [lists, setLists] = useState<(ContactList & { contact_count: number })[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAddContactsOpen, setIsAddContactsOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedList, setSelectedList] = useState<ContactList | null>(null);
  const [listMembers, setListMembers] = useState<Contact[]>([]);
  const [newList, setNewList] = useState({ name: '', description: '' });
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);

  useEffect(() => {
    fetchLists();
    fetchAllContacts();
  }, []);

  const fetchLists = async () => {
    try {
      const { data: listsData, error: listsError } = await supabase
        .from('contact_lists')
        .select('*')
        .order('created_at', { ascending: false });

      if (listsError) throw listsError;

      // Get counts for each list
      const listsWithCounts = await Promise.all(
        (listsData || []).map(async (list) => {
          const { count } = await supabase
            .from('contact_list_members')
            .select('*', { count: 'exact', head: true })
            .eq('list_id', list.id);
          return { ...list, contact_count: count || 0 };
        })
      );

      setLists(listsWithCounts);
    } catch (error) {
      console.error('Error fetching lists:', error);
      toast.error('Failed to fetch contact lists');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllContacts = async () => {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching contacts:', error);
      return;
    }
    setContacts((data || []) as Contact[]);
  };

  const fetchListMembers = async (listId: string) => {
    const { data, error } = await supabase
      .from('contact_list_members')
      .select(`
        *,
        contact:contacts(*)
      `)
      .eq('list_id', listId);

    if (error) {
      console.error('Error fetching list members:', error);
      return;
    }

    setListMembers(data?.map((m: any) => m.contact) || []);
  };

  const createList = async () => {
    if (!newList.name.trim()) {
      toast.error('Please enter a list name');
      return;
    }

    const { error } = await supabase
      .from('contact_lists')
      .insert([{ name: newList.name, description: newList.description || null }]);

    if (error) {
      console.error('Error creating list:', error);
      toast.error('Failed to create list');
      return;
    }

    toast.success('List created successfully');
    setIsCreateOpen(false);
    setNewList({ name: '', description: '' });
    fetchLists();
  };

  const deleteList = async (id: string) => {
    const { error } = await supabase.from('contact_lists').delete().eq('id', id);

    if (error) {
      console.error('Error deleting list:', error);
      toast.error('Failed to delete list');
      return;
    }

    toast.success('List deleted');
    fetchLists();
  };

  const addContactsToList = async () => {
    if (!selectedList || selectedContacts.length === 0) return;

    const { error } = await supabase.from('contact_list_members').insert(
      selectedContacts.map((contactId) => ({
        list_id: selectedList.id,
        contact_id: contactId,
      }))
    );

    if (error) {
      if (error.code === '23505') {
        toast.error('Some contacts are already in this list');
      } else {
        console.error('Error adding contacts:', error);
        toast.error('Failed to add contacts');
      }
      return;
    }

    toast.success(`Added ${selectedContacts.length} contacts to list`);
    setIsAddContactsOpen(false);
    setSelectedContacts([]);
    fetchLists();
  };

  const removeContactFromList = async (contactId: string, listId: string) => {
    const { error } = await supabase
      .from('contact_list_members')
      .delete()
      .eq('contact_id', contactId)
      .eq('list_id', listId);

    if (error) {
      console.error('Error removing contact:', error);
      toast.error('Failed to remove contact');
      return;
    }

    toast.success('Contact removed from list');
    fetchListMembers(listId);
    fetchLists();
  };

  const openViewList = async (list: ContactList) => {
    setSelectedList(list);
    await fetchListMembers(list.id);
    setIsViewOpen(true);
  };

  const openAddContacts = (list: ContactList) => {
    setSelectedList(list);
    setSelectedContacts([]);
    setIsAddContactsOpen(true);
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between animate-fade-in">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
                Contacts
              </span>
            </div>
            <h1 className="text-3xl font-serif font-semibold text-foreground tracking-tight">Contact Lists</h1>
            <p className="text-muted-foreground mt-1">
              Organize your contacts into targeted lists for campaigns
            </p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button variant="gold">
                <Plus className="w-4 h-4 mr-2" />
                Create List
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-foreground">Create New List</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    List Name *
                  </label>
                  <Input
                    value={newList.name}
                    onChange={(e) => setNewList({ ...newList, name: e.target.value })}
                    placeholder="e.g., Tier 1 VCs"
                    className="bg-input border-border"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Description
                  </label>
                  <Textarea
                    value={newList.description}
                    onChange={(e) => setNewList({ ...newList, description: e.target.value })}
                    placeholder="Optional description..."
                    className="bg-input border-border"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="gold" onClick={createList}>
                    Create List
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Lists Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            Array(3)
              .fill(0)
              .map((_, i) => (
                <Card key={i} className="bg-card border-border animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-6 bg-secondary rounded w-1/2 mb-4" />
                    <div className="h-4 bg-secondary rounded w-3/4" />
                  </CardContent>
                </Card>
              ))
          ) : lists.length === 0 ? (
            <Card className="bg-card border-border col-span-full">
              <CardContent className="p-12 text-center">
                <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">No lists yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first contact list to organize your outreach
                </p>
                <Button variant="gold" onClick={() => setIsCreateOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create List
                </Button>
              </CardContent>
            </Card>
          ) : (
            lists.map((list) => (
              <Card key={list.id} className="bg-card border-border hover:border-primary/30 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-foreground">{list.name}</CardTitle>
                      {list.description && (
                        <p className="text-sm text-muted-foreground mt-1">{list.description}</p>
                      )}
                    </div>
                    <Badge className="bg-primary/20 text-primary border-primary/30">
                      {list.contact_count} contacts
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openViewList(list)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openAddContacts(list)}
                    >
                      <UserPlus className="w-4 h-4 mr-1" />
                      Add
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteList(list.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* View List Dialog */}
        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent className="bg-card border-border max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-foreground flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                {selectedList?.name}
              </DialogTitle>
            </DialogHeader>
            <div className="pt-4">
              {listMembers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No contacts in this list yet
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {listMembers.map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell className="font-medium text-foreground">
                          {contact.name || '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{contact.email}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {contact.company || '-'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() =>
                              selectedList && removeContactFromList(contact.id, selectedList.id)
                            }
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Contacts Dialog */}
        <Dialog open={isAddContactsOpen} onOpenChange={setIsAddContactsOpen}>
          <DialogContent className="bg-card border-border max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-foreground">
                Add Contacts to {selectedList?.name}
              </DialogTitle>
            </DialogHeader>
            <div className="pt-4">
              <p className="text-sm text-muted-foreground mb-4">
                Selected: {selectedContacts.length} contacts
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <input
                        type="checkbox"
                        className="rounded border-border"
                        checked={selectedContacts.length === contacts.length}
                        onChange={(e) =>
                          setSelectedContacts(
                            e.target.checked ? contacts.map((c) => c.id) : []
                          )
                        }
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Company</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          className="rounded border-border"
                          checked={selectedContacts.includes(contact.id)}
                          onChange={(e) =>
                            setSelectedContacts(
                              e.target.checked
                                ? [...selectedContacts, contact.id]
                                : selectedContacts.filter((id) => id !== contact.id)
                            )
                          }
                        />
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {contact.name || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{contact.email}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {contact.company || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-end gap-3 mt-4">
                <Button variant="outline" onClick={() => setIsAddContactsOpen(false)}>
                  Cancel
                </Button>
                <Button variant="gold" onClick={addContactsToList}>
                  Add {selectedContacts.length} Contacts
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
