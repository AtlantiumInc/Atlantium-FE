import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  PenLine, Plus, Search, Pencil, Trash2, Loader2, Eye, BookOpen, Scissors,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ContentMarkdown } from "@/components/content/ContentMarkdown";
import { api, type AdminContentDocument, type ContentCollection } from "@/lib/api";

const emptyForm = {
  type: "post" as "post" | "doc",
  format: "article" as "article" | "guide" | "reference",
  slug: "",
  title: "",
  excerpt: "",
  body_md: "",
  cover_image_url: "",
  tags: "",
  collection_id: "",
  status: "draft" as "draft" | "published" | "archived",
  gate: "preview" as "public" | "preview" | "member",
  presentation: "" as "" | "howto" | "ebook" | "comparison",
};

const statusColors: Record<string, string> = {
  published: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
  draft: "bg-amber-500/10 border-amber-500/30 text-amber-400",
  archived: "bg-muted/50 border-border/50 text-muted-foreground",
};

export function AdminContentPage() {
  const [documents, setDocuments] = useState<AdminContentDocument[]>([]);
  const [collections, setCollections] = useState<ContentCollection[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "post" | "doc">("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminContentDocument | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<AdminContentDocument | null>(null);
  const [newCollection, setNewCollection] = useState("");

  const fetchAll = useCallback(async () => {
    setIsFetching(true);
    try {
      const [docs, cols] = await Promise.all([
        api.adminListContentDocuments(),
        api.getContentCollections(),
      ]);
      setDocuments(docs.documents);
      setCollections(cols.collections);
    } catch {
      toast.error("Failed to load content");
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filtered = useMemo(() => documents.filter((d) =>
    (typeFilter === "all" || d.type === typeFilter) &&
    (!search.trim() || d.title.toLowerCase().includes(search.toLowerCase()) || d.slug.includes(search.toLowerCase()))
  ), [documents, typeFilter, search]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowPreview(false); setIsFormOpen(true); };
  const openEdit = (d: AdminContentDocument) => {
    setEditing(d);
    setForm({
      type: d.type,
      format: d.format,
      slug: d.slug,
      title: d.title,
      excerpt: d.excerpt ?? "",
      body_md: d.body_md,
      cover_image_url: d.cover_image_url ?? "",
      tags: d.tags.join(", "),
      collection_id: d.collection_id ?? "",
      status: d.status,
      gate: d.gate,
      presentation: (d.meta?.guide?.presentation as "" | "howto" | "ebook" | "comparison") ?? "",
    });
    setShowPreview(false);
    setIsFormOpen(true);
  };

  const buildPayload = () => ({
    type: form.type,
    format: form.format,
    slug: form.slug.trim(),
    title: form.title.trim(),
    excerpt: form.excerpt.trim() || null,
    body_md: form.body_md,
    cover_image_url: form.cover_image_url.trim() || null,
    tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
    collection_id: form.collection_id || null,
    status: form.status,
    gate: form.gate,
    meta: {
      ...(editing?.meta ?? {}),
      guide: {
        ...(editing?.meta?.guide ?? {}),
        ...(form.presentation ? { presentation: form.presentation } : { presentation: undefined }),
      },
    },
  });

  const save = async () => {
    if (!form.title.trim() || !form.slug.trim()) {
      toast.error("Title and slug are required");
      return;
    }
    setIsSaving(true);
    try {
      if (editing) await api.adminUpdateContentDocument(editing.id, buildPayload());
      else await api.adminCreateContentDocument(buildPayload());
      toast.success(editing ? "Saved" : "Created");
      setIsFormOpen(false);
      await fetchAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async () => {
    if (!deleteConfirm) return;
    try {
      await api.adminDeleteContentDocument(deleteConfirm.id);
      toast.success("Deleted");
      setDeleteConfirm(null);
      await fetchAll();
    } catch {
      toast.error("Delete failed");
    }
  };

  const addCollection = async () => {
    const title = newCollection.trim();
    if (!title) return;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    try {
      await api.adminCreateContentCollection({ slug, title });
      setNewCollection("");
      await fetchAll();
      toast.success(`Collection "${title}" created`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create collection");
    }
  };

  const insertMoreMarker = () => {
    setForm((f) => ({ ...f, body_md: f.body_md.includes("<!--more-->") ? f.body_md : `${f.body_md.trimEnd()}\n\n<!--more-->\n\n` }));
    toast.info("Gate marker inserted — everything after it requires membership");
  };

  const published = documents.filter((d) => d.status === "published");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Content</h2>
          <p className="text-muted-foreground">Blog posts, docs, and guides — markdown, gated, versioned by you</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />New Document</Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Published</CardTitle>
            <Eye className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{isFetching ? "…" : published.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Drafts</CardTitle>
            <PenLine className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{isFetching ? "…" : documents.filter((d) => d.status === "draft").length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Guides</CardTitle>
            <BookOpen className="h-4 w-4 text-violet-400" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{isFetching ? "…" : documents.filter((d) => d.format === "guide").length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Collections</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isFetching ? "…" : collections.length}</div>
            <div className="flex gap-1 mt-2">
              <Input
                value={newCollection}
                onChange={(e) => setNewCollection(e.target.value)}
                placeholder="New collection..."
                className="h-7 text-xs"
                onKeyDown={(e) => e.key === "Enter" && addCollection()}
              />
              <Button size="sm" variant="outline" className="h-7 px-2" onClick={addCollection}>+</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search title or slug..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="post">Blog Posts</SelectItem>
                <SelectItem value="doc">Docs</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader><CardTitle>Documents ({filtered.length})</CardTitle></CardHeader>
        <CardContent>
          {isFetching ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Gate</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <div className="font-medium">{d.title}</div>
                      <div className="text-xs text-muted-foreground">/{d.type === "post" ? "blog" : "docs"}/{d.slug}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{d.type === "post" ? "post" : d.format}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${statusColors[d.status]}`}>{d.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{d.gate}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(d.updated_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(d)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-400" onClick={() => setDeleteConfirm(d)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Editor dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Document" : "New Document"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as typeof f.type }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="post">Blog Post</SelectItem>
                    <SelectItem value="doc">Doc</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Format</Label>
                <Select value={form.format} onValueChange={(v) => setForm((f) => ({ ...f, format: v as typeof f.format }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="article">Article</SelectItem>
                    <SelectItem value="guide">Guide</SelectItem>
                    <SelectItem value="reference">Reference</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as typeof f.status }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Gate</Label>
                <Select value={form.gate} onValueChange={(v) => setForm((f) => ({ ...f, gate: v as typeof f.gate }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public (no gate)</SelectItem>
                    <SelectItem value="preview">Preview (gate at marker)</SelectItem>
                    <SelectItem value="member">Members only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Title</Label>
                <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Slug</Label>
                <Input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") }))} placeholder="my-post-slug" />
              </div>
            </div>

            <div>
              <Label className="text-xs">Excerpt (card + SEO description)</Label>
              <Textarea value={form.excerpt} onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))} className="min-h-[50px]" />
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              {form.type === "doc" && (
                <div>
                  <Label className="text-xs">Reader style (docs)</Label>
                  <Select value={form.presentation || "auto"} onValueChange={(v) => setForm((f) => ({ ...f, presentation: (v === "auto" ? "" : v) as typeof f.presentation }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto (from format)</SelectItem>
                      <SelectItem value="howto">How-to (steps)</SelectItem>
                      <SelectItem value="ebook">Native eBook</SelectItem>
                      <SelectItem value="comparison">SaaS comparison</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label className="text-xs">Collection (docs)</Label>
                <Select value={form.collection_id || "none"} onValueChange={(v) => setForm((f) => ({ ...f, collection_id: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {collections.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Tags (comma-separated)</Label>
                <Input value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Cover image URL</Label>
                <Input value={form.cover_image_url} onChange={(e) => setForm((f) => ({ ...f, cover_image_url: e.target.value }))} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs">Body (markdown)</Label>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={insertMoreMarker}>
                    <Scissors className="h-3 w-3 mr-1" /> Insert gate marker
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowPreview((p) => !p)}>
                    <Eye className="h-3 w-3 mr-1" /> {showPreview ? "Edit" : "Preview"}
                  </Button>
                </div>
              </div>
              {showPreview ? (
                <div className="rounded-lg border border-border/40 bg-card/40 p-4 min-h-[280px]">
                  <ContentMarkdown markdown={form.body_md || "*Nothing to preview yet.*"} />
                </div>
              ) : (
                <Textarea
                  value={form.body_md}
                  onChange={(e) => setForm((f) => ({ ...f, body_md: e.target.value }))}
                  className="min-h-[280px] font-mono text-xs"
                  placeholder={"# Heading\n\nIntro paragraph readers see for free...\n\n<!--more-->\n\nThe rest requires a free membership."}
                />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {editing ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete "{deleteConfirm?.title}"?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This permanently removes the document and its discussion.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={remove}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
