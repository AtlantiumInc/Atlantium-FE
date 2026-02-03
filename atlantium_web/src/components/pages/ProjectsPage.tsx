import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  FolderKanban,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from "lucide-react";

interface Project {
  id: string;
  name: string;
  description: string;
  status: "active" | "completed" | "paused";
  progress: number;
  updatedAt: string;
}

const mockProjects: Project[] = [
  {
    id: "1",
    name: "MVP Development",
    description: "Building the initial product version with core features",
    status: "active",
    progress: 65,
    updatedAt: "2 hours ago",
  },
  {
    id: "2",
    name: "GTM Strategy",
    description: "Go-to-market playbook and launch planning",
    status: "active",
    progress: 40,
    updatedAt: "1 day ago",
  },
  {
    id: "3",
    name: "System Integration",
    description: "API integrations with third-party services",
    status: "completed",
    progress: 100,
    updatedAt: "1 week ago",
  },
];

const statusConfig = {
  active: {
    label: "Active",
    icon: Clock,
    className: "text-blue-500 bg-blue-500/10",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    className: "text-green-500 bg-green-500/10",
  },
  paused: {
    label: "Paused",
    icon: AlertCircle,
    className: "text-amber-500 bg-amber-500/10",
  },
};

export function ProjectsPage() {
  const [projects] = useState<Project[]>(mockProjects);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-muted-foreground mt-1">
            Track and manage your ongoing projects with Atlantium.
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Projects Grid */}
      {projects.length > 0 ? (
        <div className="grid gap-4">
          {projects.map((project) => {
            const status = statusConfig[project.status];
            const StatusIcon = status.icon;

            return (
              <div
                key={project.id}
                className="group bg-card border border-border rounded-xl p-6 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FolderKanban className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{project.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {project.description}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.className}`}
                  >
                    <StatusIcon className="h-3.5 w-3.5" />
                    {status.label}
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{project.progress}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-muted-foreground">
                      Updated {project.updatedAt}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      View Details
                      <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-16 bg-card border border-border rounded-xl">
          <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-4">
            <FolderKanban className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-1">No projects yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Start a project with Atlantium to track it here.
          </p>
          <a href="mailto:team@atlantium.ai">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Start a Project
            </Button>
          </a>
        </div>
      )}
    </div>
  );
}
