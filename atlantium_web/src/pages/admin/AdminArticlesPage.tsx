import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  FileText,
  Loader2,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { api, type FrontierArticle } from "@/lib/api";

const defaultFormData = {
  title: "",
  body: "",
  tags: "",
  tldr: "",
  author_name: "Atlantium Editorial",
  author_avatar_url: "",
  publisher_name: "Atlantium Index",
  publisher_logo_url: "",
  featured_image_url: "",
  featured_image_alt: "",
  status: "publish" as "draft" | "publish",
};

export function AdminArticlesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [articles, setArticles] = useState<FrontierArticle[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(searchParams.get("new") === "true");
  const [editingArticle, setEditingArticle] = useState<FrontierArticle | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [formData, setFormData] = useState(defaultFormData);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const data = await api.getAdminArticles();
        setArticles(data);
      } catch (error) {
        toast.error("Failed to load articles");
      } finally {
        setIsFetching(false);
      }
    };
    fetchArticles();
  }, []);

  const filteredArticles = articles.filter((article) => {
    const title = article.content?.title || "";
    const tags = article.content?.tags || [];
    return (
      title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleCreate = () => {
    setEditingArticle(null);
    setFormData(defaultFormData);
    setIsFormOpen(true);
  };

  const handleEdit = (article: FrontierArticle) => {
    setEditingArticle(article);
    setFormData({
      title: article.content?.title || "",
      body: article.content?.body || "",
      tags: (article.content?.tags || []).join(", "),
      tldr: (article.content?.tldr || []).join("\n"),
      author_name: article.content?.author?.name || "Atlantium Editorial",
      author_avatar_url: article.content?.author?.avatar_url || "",
      publisher_name: article.content?.publisher?.name || "Atlantium Index",
      publisher_logo_url: article.content?.publisher?.logo_url || "",
      featured_image_url: article.content?.featured_image?.url || "",
      featured_image_alt: article.content?.featured_image?.alt || "",
      status: (article.status as "draft" | "publish") || "publish",
    });
    setIsFormOpen(true);
  };

  const buildContent = (): FrontierArticle["content"] => ({
    title: formData.title,
    body: formData.body,
    tags: formData.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    tldr: formData.tldr
      .split("\n")
      .map((t) => t.trim())
      .filter(Boolean),
    author: {
      name: formData.author_name || "Atlantium Editorial",
      avatar_url: formData.author_avatar_url,
    },
    publisher: {
      name: formData.publisher_name || "Atlantium Index",
      logo_url: formData.publisher_logo_url,
      published_at: editingArticle
        ? editingArticle.content?.publisher?.published_at || new Date().toISOString()
        : new Date().toISOString(),
    },
    featured_image: {
      url: formData.featured_image_url,
      alt: formData.featured_image_alt,
      caption: "",
    },
  });

  const handleSave = async () => {
    if (!formData.title) {
      toast.error("Title is required");
      return;
    }

    setIsLoading(true);
    try {
      if (editingArticle) {
        const updated = await api.updateAdminArticle({
          article_id: editingArticle.id,
          content: buildContent(),
          status: formData.status,
        });
        setArticles(articles.map((a) => (a.id === editingArticle.id ? updated : a)));
        toast.success("Article updated successfully");
      } else {
        const created = await api.createAdminArticle({
          content: buildContent(),
          status: formData.status,
        });
        setArticles([created, ...articles]);
        toast.success("Article created successfully");
      }
      setIsFormOpen(false);
      setSearchParams({});
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : editingArticle
            ? "Failed to update article"
            : "Failed to create article"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteAdminArticle(id);
      setArticles(articles.filter((a) => a.id !== id));
      toast.success("Article deleted successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete article");
    } finally {
      setDeleteConfirmId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Articles</h2>
          <p className="text-muted-foreground">Manage frontier articles and content</p>
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
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredArticles.map((article) => (
                <TableRow key={article.id}>
                  <TableCell className="font-medium">
                    {article.content?.title || "Untitled"}
                  </TableCell>
                  <TableCell>{article.content?.author?.name || "-"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {(article.content?.tags || []).slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {(article.content?.tags || []).length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{article.content.tags.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {article.status === "draft" ? (
                      <Badge variant="outline">Draft</Badge>
                    ) : (
                      <Badge variant="secondary">Published</Badge>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(article.created_at)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => handleEdit(article)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onSelect={() => setDeleteConfirmId(article.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {isFetching && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin" />
                    Loading articles...
                  </TableCell>
                </TableRow>
              )}
              {!isFetching && filteredArticles.length === 0 && (
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
      <Dialog
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setSearchParams({});
        }}
      >
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
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Article title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="body">Body (HTML)</Label>
              <Textarea
                id="body"
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                placeholder="Full article content in HTML..."
                rows={10}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="tech, ai, blockchain"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tldr">TL;DR (one point per line)</Label>
              <Textarea
                id="tldr"
                value={formData.tldr}
                onChange={(e) => setFormData({ ...formData, tldr: e.target.value })}
                placeholder={"Key takeaway 1\nKey takeaway 2\nKey takeaway 3"}
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="author_name">Author Name</Label>
                <Input
                  id="author_name"
                  value={formData.author_name}
                  onChange={(e) => setFormData({ ...formData, author_name: e.target.value })}
                  placeholder="Atlantium Editorial"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="author_avatar_url">Author Avatar URL</Label>
                <Input
                  id="author_avatar_url"
                  value={formData.author_avatar_url}
                  onChange={(e) => setFormData({ ...formData, author_avatar_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="publisher_name">Publisher Name</Label>
                <Input
                  id="publisher_name"
                  value={formData.publisher_name}
                  onChange={(e) => setFormData({ ...formData, publisher_name: e.target.value })}
                  placeholder="Atlantium Index"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="publisher_logo_url">Publisher Logo URL</Label>
                <Input
                  id="publisher_logo_url"
                  value={formData.publisher_logo_url}
                  onChange={(e) => setFormData({ ...formData, publisher_logo_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="featured_image_url">Featured Image URL</Label>
                <Input
                  id="featured_image_url"
                  value={formData.featured_image_url}
                  onChange={(e) => setFormData({ ...formData, featured_image_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="featured_image_alt">Featured Image Alt</Label>
                <Input
                  id="featured_image_alt"
                  value={formData.featured_image_alt}
                  onChange={(e) => setFormData({ ...formData, featured_image_alt: e.target.value })}
                  placeholder="Image description"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value as "draft" | "publish" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="publish">Publish</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsFormOpen(false);
                setSearchParams({});
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {editingArticle ? "Saving..." : "Creating..."}
                </>
              ) : editingArticle ? (
                "Save Changes"
              ) : (
                "Create Article"
              )}
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
