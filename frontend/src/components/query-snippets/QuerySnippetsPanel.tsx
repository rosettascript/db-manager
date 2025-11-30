/**
 * Query Snippets Library Panel
 */

import { useState } from 'react';
import {
  useQuerySnippets,
  useSnippetCategories,
  useCreateSnippet,
  useUpdateSnippet,
  useDeleteSnippet,
} from '@/hooks/useQuerySnippets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Copy,
  FileCode,
  Folder,
} from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { toast } from '@/hooks/use-toast';
import type { QuerySnippet, CreateQuerySnippetDto } from '@/lib/api/types';

export function QuerySnippetsPanel({
  onInsertSnippet,
}: {
  onInsertSnippet?: (snippet: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [editingSnippet, setEditingSnippet] = useState<QuerySnippet | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  const debouncedSearch = useDebounce(searchQuery, 300);
  
  const { data: snippets, isLoading } = useQuerySnippets({
    category: selectedCategory,
    search: debouncedSearch || undefined,
  });
  
  const { data: categories } = useSnippetCategories();
  const createMutation = useCreateSnippet();
  const updateMutation = useUpdateSnippet();
  const deleteMutation = useDeleteSnippet();

  const handleCreate = (data: CreateQuerySnippetDto) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        setIsCreateDialogOpen(false);
        setSearchQuery('');
      },
    });
  };

  const handleUpdate = (id: string, data: Partial<CreateQuerySnippetDto>) => {
    updateMutation.mutate(
      { id, dto: data },
      {
        onSuccess: () => {
          setEditingSnippet(null);
        },
      },
    );
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this snippet?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleCopy = (snippet: string) => {
    navigator.clipboard.writeText(snippet);
    toast({
      title: 'Copied',
      description: 'Snippet copied to clipboard',
    });
  };

  const handleInsert = (snippet: string) => {
    if (onInsertSnippet) {
      onInsertSnippet(snippet);
    } else {
      handleCopy(snippet);
    }
  };

  const groupedSnippets = snippets?.reduce((acc, snippet) => {
    const category = snippet.category || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(snippet);
    return acc;
  }, {} as Record<string, QuerySnippet[]>) || {};

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileCode className="w-5 h-5" />
            Query Snippets
          </h2>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                New
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <SnippetDialog
                onSave={handleCreate}
                onCancel={() => setIsCreateDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search snippets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>

        {categories && categories.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={selectedCategory === undefined ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(undefined)}
            >
              All
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </Button>
            ))}
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : Object.keys(groupedSnippets).length > 0 ? (
          <div className="space-y-6">
            {Object.entries(groupedSnippets).map(([category, categorySnippets]) => (
              <div key={category}>
                <div className="flex items-center gap-2 mb-3">
                  <Folder className="w-4 h-4 text-muted-foreground" />
                  <h3 className="font-medium text-sm text-muted-foreground">{category}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {categorySnippets.length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {categorySnippets.map((snippet) => (
                    <div
                      key={snippet.id}
                      className="p-3 rounded-lg border hover:bg-accent transition-colors group"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{snippet.name}</h4>
                          {snippet.description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {snippet.description}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setEditingSnippet(snippet)}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleDelete(snippet.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="bg-muted p-2 rounded text-xs font-mono mb-2 line-clamp-2">
                        {snippet.snippet}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleCopy(snippet.snippet)}
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          Copy
                        </Button>
                        {onInsertSnippet && (
                          <Button
                            variant="default"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => handleInsert(snippet.snippet)}
                          >
                            Insert
                          </Button>
                        )}
                        {snippet.tags && snippet.tags.length > 0 && (
                          <div className="flex gap-1 ml-auto">
                            {snippet.tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <FileCode className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No snippets found</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              Create your first snippet
            </Button>
          </div>
        )}
      </ScrollArea>

      {editingSnippet && (
        <Dialog open={!!editingSnippet} onOpenChange={(open) => !open && setEditingSnippet(null)}>
          <DialogContent className="max-w-2xl">
            <SnippetDialog
              snippet={editingSnippet}
              onSave={(data) => handleUpdate(editingSnippet.id, data)}
              onCancel={() => setEditingSnippet(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function SnippetDialog({
  snippet,
  onSave,
  onCancel,
}: {
  snippet?: QuerySnippet;
  onSave: (data: CreateQuerySnippetDto) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(snippet?.name || '');
  const [snippetText, setSnippetText] = useState(snippet?.snippet || '');
  const [description, setDescription] = useState(snippet?.description || '');
  const [category, setCategory] = useState<string>(snippet?.category || 'uncategorized');
  const [tags, setTags] = useState(snippet?.tags?.join(', ') || '');
  const { data: categories } = useSnippetCategories();

  const handleSubmit = () => {
    if (!name || !snippetText) {
      toast({
        title: 'Error',
        description: 'Name and snippet are required',
        variant: 'destructive',
      });
      return;
    }

    onSave({
      name,
      snippet: snippetText,
      description: description || undefined,
      category: category === 'uncategorized' ? undefined : category,
      tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
    });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{snippet ? 'Edit Snippet' : 'Create Snippet'}</DialogTitle>
        <DialogDescription>
          Create a reusable SQL snippet that you can quickly insert into queries
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Select all users"
            />
          </div>
          <div>
            <Label htmlFor="snippet">Snippet *</Label>
            <Textarea
              id="snippet"
              value={snippetText}
              onChange={(e) => setSnippetText(e.target.value)}
              placeholder="SELECT * FROM users WHERE id = ?"
              className="font-mono"
              rows={6}
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Category</Label>
              <Select 
                value={category} 
                onValueChange={setCategory}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="uncategorized">Uncategorized</SelectItem>
                  {categories && categories.length > 0 && categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="users, select, common"
              />
            </div>
          </div>
        </div>
      <DialogFooter>
        <Button 
          variant="outline" 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onCancel();
          }} 
          type="button"
        >
          Cancel
        </Button>
        <Button 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleSubmit();
          }} 
          type="button"
        >
          {snippet ? 'Update' : 'Create'}
        </Button>
      </DialogFooter>
    </>
  );
}

