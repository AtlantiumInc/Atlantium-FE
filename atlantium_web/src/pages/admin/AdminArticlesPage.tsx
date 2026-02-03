import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  FileText,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface Article {
  id: string;
  title: string;
  summary: string;
  content: string;
  author: string;
  tags: string[];
  created_at: string;
  is_edited: boolean;
  external_url?: string;
}

// Placeholder data
const mockArticles: Article[] = [
  {
    id: "1",
    title: "Getting Started with Atlantium",
    summary: "A comprehensive guide to get you up and running",
    content: "Full article content here...",
    author: "Admin",
    tags: ["guide", "beginner"],
    created_at: "2024-12-28T10:00:00Z",
    is_edited: false,
  },
  {
    id: "2",
    title: "Best Practices for Team Collaboration",
    summary: "Tips and tricks for effective teamwork",
    content: "Full article content here...",
    author: "Team Lead",
    tags: ["tips", "collaboration"],
    created_at: "2024-12-25T14:00:00Z",
    is_edited: true,
  },
  {
    id: "3",
    title: "New Feature Announcement",
    summary: "Introducing our latest updates and improvements",
    content: "Full article content here...",
    author: "Product",
    tags: ["announcement", "features"],
    created_at: "2024-12-20T09:00:00Z",
    is_edited: false,
    external_url: "https://example.com/blog/new-features",
  },
];

export function AdminArticlesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [articles] = useState<Article[]>(mockArticles);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(searchParams.get("new") === "true");
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    summary: "",
    content: "",
    author: "",
    tags: "",
    external_url: "",
  });

  const filteredArticles = articles.filter((article) =>
    article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleCreate = () => {
    setEditingArticle(null);
    setFormData({
      title: "",
      summary: "",
      content: "",
      author: "",
      tags: "",
      external_url: "",
    });
    setIsFormOpen(true);
  };

  const handleEdit = (article: Article) => {
    setEditingArticle(article);
    setFormData({
      title: article.title,
      summary: article.summary,
      content: article.content,
      author: article.author,
      tags: article.tags.join(", "),
      external_url: article.external_url || "",
    });
    setIsFormOpen(true);
  };

  const handleSave = () => {
    // TODO: Implement API call to save article
    console.log("Saving article:", formData);
    setIsFormOpen(false);
    setSearchParams({});
  };

  const handleDelete = (id: string) => {
    // TODO: Implement API call to delete article
    console.log("Deleting article:", id);
    setDeleteConfirmId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Articles</h2>
          <p className="text-muted-foreground">Manage your articles and content</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          New Article
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search articles by title or tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Articles Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Articles ({filteredArticles.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredArticles.map((article) => (
                <TableRow key={article.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{article.title}</span>
                      {article.external_url && (
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{article.author}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {article.tags.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {article.tags.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{article.tags.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{formatDate(article.created_at)}</TableCell>
                  <TableCell>
                    {article.is_edited ? (
                      <Badge variant="outline">Edited</Badge>
                    ) : (
                      <Badge variant="secondary">Published</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(article)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteConfirmId(article.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filteredArticles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    No articles found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={(open) => {
        setIsFormOpen(open);
        if (!open) setSearchParams({});
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingArticle ? "Edit Article" : "Create New Article"}
            </DialogTitle>
            <DialogDescription>
              {editingArticle
                ? "Update the article details below."
                : "Fill in the details for your new article."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Article title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="summary">Summary</Label>
              <Textarea
                id="summary"
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                placeholder="Brief summary of the article"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Full article content (Markdown supported)"
                rows={10}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="author">Author</Label>
                <Input
                  id="author"
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  placeholder="Author name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="Comma-separated tags"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="external_url">External URL (optional)</Label>
              <Input
                id="external_url"
                value={formData.external_url}
                onChange={(e) => setFormData({ ...formData, external_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsFormOpen(false);
              setSearchParams({});
            }}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingArticle ? "Save Changes" : "Create Article"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Article</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this article? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => handleDelete(deleteConfirmId!)}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
