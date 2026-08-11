import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Briefcase,
  Loader2,
  RefreshCw,
  ExternalLink,
  Archive,
  ArchiveRestore,
  Building2,
  Sparkles,
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
import { api, type JobPosting } from "@/lib/api";
import { isNewThisWeek } from "@/lib/utils";

const WORKPLACE_TYPES = ["Remote", "Hybrid", "Onsite"];
const SENIORITY_LEVELS = ["Entry Level", "Mid Level", "Senior Level", "Lead", "Manager"];

const workplaceColors: Record<string, string> = {
  remote: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
  hybrid: "bg-violet-500/10 border-violet-500/30 text-violet-400",
  onsite: "bg-blue-500/10 border-blue-500/30 text-blue-400",
};

const emptyForm = {
  title: "",
  company: "",
  location: "Atlanta, Georgia, United States",
  workplace_type: "Onsite",
  seniority: "",
  salary_min: "",
  salary_max: "",
  apply_url: "",
  posted_at: "",
  requirements_summary: "",
  tech_stack: "",
};

function formatSalary(min?: number | null, max?: number | null): string {
  const fmt = (n: number) => (n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`);
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `${fmt(min)}+`;
  if (max) return `Up to ${fmt(max)}`;
  return "—";
}

function formatDate(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function AdminJobsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "expired">("active");
  const [workplaceFilter, setWorkplaceFilter] = useState("all");
  const [isFormOpen, setIsFormOpen] = useState(searchParams.get("new") === "true");
  const [editingJob, setEditingJob] = useState<JobPosting | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<JobPosting | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [isRescraping, setIsRescraping] = useState(false);
  const [formData, setFormData] = useState(emptyForm);

  const fetchJobs = useCallback(async (status: "active" | "expired") => {
    setIsFetching(true);
    try {
      const data = await api.getJobPostings({ status });
      setJobs(data);
    } catch {
      toast.error("Failed to load job postings");
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs(statusFilter);
  }, [fetchJobs, statusFilter]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return jobs.filter((job) => {
      const matchesSearch =
        !q ||
        job.title.toLowerCase().includes(q) ||
        job.company.toLowerCase().includes(q) ||
        (job.content?.tech_stack ?? []).some((t) => t.toLowerCase().includes(q));
      const matchesWorkplace =
        workplaceFilter === "all" ||
        job.workplace_type?.toLowerCase() === workplaceFilter.toLowerCase();
      return matchesSearch && matchesWorkplace;
    });
  }, [jobs, searchQuery, workplaceFilter]);

  const newThisWeek = useMemo(() => jobs.filter(isNewThisWeek).length, [jobs]);
  const companies = useMemo(
    () => new Set(jobs.map((j) => j.company.toLowerCase())).size,
    [jobs],
  );

  const handleRescrape = async () => {
    setIsRescraping(true);
    toast.info("Rescraping hiring.cafe — this takes ~30 seconds...");
    try {
      const r = await api.rescrapeJobPostings();
      toast.success(
        `Rescrape done: ${r.created} new, ${r.reactivated} reactivated, ${r.expired} expired (${r.kept} on the board)`,
      );
      await fetchJobs(statusFilter);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Rescrape failed");
    } finally {
      setIsRescraping(false);
    }
  };

  const handleCreate = () => {
    setEditingJob(null);
    setFormData(emptyForm);
    setIsFormOpen(true);
  };

  const handleEdit = (job: JobPosting) => {
    setEditingJob(job);
    setFormData({
      title: job.title,
      company: job.company,
      location: job.location,
      workplace_type: job.workplace_type || "",
      seniority: job.seniority || "",
      salary_min: job.salary_min != null ? String(job.salary_min) : "",
      salary_max: job.salary_max != null ? String(job.salary_max) : "",
      apply_url: job.apply_url,
      posted_at: job.posted_at ? job.posted_at.slice(0, 10) : "",
      requirements_summary: job.content?.requirements_summary || "",
      tech_stack: (job.content?.tech_stack ?? []).join(", "),
    });
    setIsFormOpen(true);
  };

  const buildPayload = () => ({
    title: formData.title.trim(),
    company: formData.company.trim(),
    location: formData.location.trim(),
    workplace_type: formData.workplace_type || undefined,
    seniority: formData.seniority || undefined,
    salary_min: formData.salary_min ? Number(formData.salary_min) : null,
    salary_max: formData.salary_max ? Number(formData.salary_max) : null,
    apply_url: formData.apply_url.trim(),
    posted_at: formData.posted_at ? new Date(formData.posted_at).toISOString() : null,
    content: {
      ...(editingJob?.content ?? {}),
      requirements_summary: formData.requirements_summary.trim() || undefined,
      tech_stack: formData.tech_stack
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    },
  });

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.company.trim() || !formData.apply_url.trim()) {
      toast.error("Title, company, and apply URL are required");
      return;
    }
    setIsSaving(true);
    try {
      if (editingJob) {
        const { job } = await api.updateJobPosting(editingJob.id, buildPayload());
        setJobs(jobs.map((j) => (j.id === editingJob.id ? job : j)));
        toast.success("Job updated");
      } else {
        const job = await api.createJobPosting(buildPayload());
        setJobs([job, ...jobs]);
        toast.success("Job created");
      }
      setIsFormOpen(false);
      setSearchParams({});
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (job: JobPosting) => {
    const nextStatus = job.status === "active" ? "expired" : "active";
    try {
      await api.updateJobPosting(job.id, { status: nextStatus });
      // The row leaves the current status view either way.
      setJobs(jobs.filter((j) => j.id !== job.id));
      toast.success(nextStatus === "expired" ? "Job expired" : "Job reactivated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Status change failed");
    }
  };

  const handleDelete = async (job: JobPosting) => {
    try {
      await api.deleteJobPosting(job.id);
      setJobs(jobs.filter((j) => j.id !== job.id));
      toast.success("Job deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    } finally {
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Jobs</h2>
          <p className="text-muted-foreground">
            Atlanta tech job board — scraped weekly from hiring.cafe, editable here
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRescrape} disabled={isRescraping}>
            {isRescraping ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {isRescraping ? "Rescraping..." : "Rescrape Now"}
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            New Job
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {statusFilter === "active" ? "Active Jobs" : "Expired Jobs"}
            </CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isFetching ? "…" : jobs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">New This Week</CardTitle>
            <Sparkles className="h-4 w-4 text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-400">{isFetching ? "…" : newThisWeek}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Companies</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isFetching ? "…" : companies}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Remote</CardTitle>
            <Briefcase className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">
              {isFetching ? "…" : jobs.filter((j) => j.workplace_type === "Remote").length}
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
              <Input
                placeholder="Search title, company, or tech..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "active" | "expired")}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
            <Select value={workplaceFilter} onValueChange={setWorkplaceFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Workplace" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Workplaces</SelectItem>
                {WORKPLACE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {statusFilter === "active" ? "Active" : "Expired"} Postings ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Workplace</TableHead>
                <TableHead>Salary</TableHead>
                <TableHead>Posted</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="font-medium max-w-[280px]">
                    <div className="flex items-center gap-2">
                      <span className="truncate">{job.title}</span>
                      {isNewThisWeek(job) && (
                        <Badge
                          variant="outline"
                          className="text-[10px] flex-shrink-0 bg-cyan-500/15 border-cyan-400/40 text-cyan-300"
                        >
                          New
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[180px] truncate">{job.company}</TableCell>
                  <TableCell>
                    {job.workplace_type ? (
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${workplaceColors[job.workplace_type.toLowerCase()] ?? ""}`}
                      >
                        {job.workplace_type}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-emerald-400 text-sm">
                    {formatSalary(job.salary_min, job.salary_max)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(job.posted_at)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => handleEdit(job)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => window.open(`/jobs/${job.slug}`, "_blank")}>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View Live
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleToggleStatus(job)}>
                          {job.status === "active" ? (
                            <>
                              <Archive className="h-4 w-4 mr-2" />
                              Expire
                            </>
                          ) : (
                            <>
                              <ArchiveRestore className="h-4 w-4 mr-2" />
                              Reactivate
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onSelect={() => setDeleteConfirm(job)}
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
                    Loading jobs...
                  </TableCell>
                </TableRow>
              )}
              {!isFetching && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    No jobs found
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
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingJob ? "Edit Job" : "Create New Job"}</DialogTitle>
            <DialogDescription>
              {editingJob
                ? "Update the posting below. Changes go live immediately."
                : "Manually add a posting to the board."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="job-title">Title *</Label>
                <Input
                  id="job-title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Senior Software Engineer"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="job-company">Company *</Label>
                <Input
                  id="job-company"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder="Company name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="job-apply-url">Apply URL *</Label>
              <Input
                id="job-apply-url"
                value={formData.apply_url}
                onChange={(e) => setFormData({ ...formData, apply_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="job-location">Location</Label>
                <Input
                  id="job-location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="job-posted">Posted Date</Label>
                <Input
                  id="job-posted"
                  type="date"
                  value={formData.posted_at}
                  onChange={(e) => setFormData({ ...formData, posted_at: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Workplace Type</Label>
                <Select
                  value={formData.workplace_type}
                  onValueChange={(v) => setFormData({ ...formData, workplace_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {WORKPLACE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Seniority</Label>
                <Select
                  value={formData.seniority}
                  onValueChange={(v) => setFormData({ ...formData, seniority: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SENIORITY_LEVELS.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="job-salary-min">Salary Min ($/yr)</Label>
                <Input
                  id="job-salary-min"
                  type="number"
                  value={formData.salary_min}
                  onChange={(e) => setFormData({ ...formData, salary_min: e.target.value })}
                  placeholder="120000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="job-salary-max">Salary Max ($/yr)</Label>
                <Input
                  id="job-salary-max"
                  type="number"
                  value={formData.salary_max}
                  onChange={(e) => setFormData({ ...formData, salary_max: e.target.value })}
                  placeholder="180000"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="job-reqs">Requirements Summary</Label>
              <Textarea
                id="job-reqs"
                value={formData.requirements_summary}
                onChange={(e) => setFormData({ ...formData, requirements_summary: e.target.value })}
                placeholder="5+ years in..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="job-stack">Tech Stack (comma-separated)</Label>
              <Input
                id="job-stack"
                value={formData.tech_stack}
                onChange={(e) => setFormData({ ...formData, tech_stack: e.target.value })}
                placeholder="React, TypeScript, PostgreSQL"
              />
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
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {editingJob ? "Saving..." : "Creating..."}
                </>
              ) : editingJob ? (
                "Save Changes"
              ) : (
                "Create Job"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Job</DialogTitle>
            <DialogDescription>
              Permanently delete "{deleteConfirm?.title}" at {deleteConfirm?.company}? Its URL will
              404. If you just want it off the board, use Expire instead.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => handleDelete(deleteConfirm!)}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
