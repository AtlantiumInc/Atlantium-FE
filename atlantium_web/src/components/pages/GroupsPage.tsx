import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  Users,
  Plus,
  MessageCircle,
  AlertCircle,
  Clock,
  Sparkles,
  Check,
  Share2,
} from "lucide-react";
import { InviteShareDialog } from "@/components/InviteShareDialog";
import { api } from "@/lib/api";
import type { Thread, Connection } from "@/lib/types";

interface GroupsPageProps {
  onNavigateToThread?: (threadId: string) => void;
}

export function GroupsPage({ onNavigateToThread }: GroupsPageProps) {
  const [groups, setGroups] = useState<Thread[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [shareGroup, setShareGroup] = useState<{ id: string; name: string } | null>(null);

  const fetchGroups = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await api.getThreads();
      // Filter for group and focus_group types
      const groupThreads = (result.threads || []).filter(
        (thread) => thread.type === "group" || thread.type === "focus_group"
      );
      setGroups(groupThreads);
    } catch (error) {
      console.error("Failed to fetch groups:", error);
      setError("Failed to load groups. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchConnections = async () => {
    try {
      const result = await api.getConnections();
      setConnections(result.connections || []);
    } catch (error) {
      console.error("Failed to fetch connections:", error);
    }
  };

  useEffect(() => {
    fetchGroups();
    fetchConnections();
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatLastActivity = (dateString?: string) => {
    if (!dateString) return "No activity";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleOpenCreateDialog = () => {
    setGroupName("");
    setSelectedMembers([]);
    setIsCreateDialogOpen(true);
  };

  const toggleMember = (userId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      setError("Please enter a group name");
      return;
    }

    try {
      setIsCreating(true);
      setError(null);
      await api.createGroupThread(groupName.trim(), selectedMembers);
      setIsCreateDialogOpen(false);
      await fetchGroups();
    } catch (error) {
      console.error("Failed to create group:", error);
      setError("Failed to create group. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Groups</h2>
            <p className="text-sm text-muted-foreground">
              Collaborate with your teams and communities
            </p>
          </div>
        </div>
        <Button onClick={handleOpenCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Create Group
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-destructive/10 text-destructive rounded-lg">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Groups Grid */}
      {groups.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No groups yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Groups you create or join will appear here
          </p>
          <Button onClick={handleOpenCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Group
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <Card
              key={group.thread_id}
              className="hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => onNavigateToThread?.(group.thread_id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback
                      className={
                        group.type === "focus_group"
                          ? "bg-cyan-500/20 text-cyan-500"
                          : "bg-primary/20 text-primary"
                      }
                    >
                      {group.type === "focus_group" ? (
                        <Sparkles className="h-5 w-5" />
                      ) : (
                        getInitials(group.name || "Group")
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold truncate">
                        {group.name || "Unnamed Group"}
                      </h4>
                      {group.type === "focus_group" && (
                        <Badge
                          variant="secondary"
                          className="bg-cyan-500/20 text-cyan-500 border-cyan-500/30"
                        >
                          Focus
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Users className="h-3 w-3" />
                      {group.participant_count || 0} members
                    </p>
                    {group.last_message_content && (
                      <p className="text-sm text-muted-foreground line-clamp-1 mt-2">
                        {group.last_message_content}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatLastActivity(group.last_message_at)}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShareGroup({
                          id: group.thread_id,
                          name: group.name || "Unnamed Group",
                        });
                      }}
                      title="Share invite link"
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateToThread?.(group.thread_id);
                      }}
                    >
                      <MessageCircle className="h-4 w-4 mr-1" />
                      Open
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Group Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Group</DialogTitle>
            <DialogDescription>
              Create a new group to collaborate with others
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="group-name">Group Name</Label>
              <Input
                id="group-name"
                placeholder="Enter group name..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                disabled={isCreating}
              />
            </div>

            <div className="space-y-2">
              <Label>Add Members (Optional)</Label>
              {connections.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No connections to add. You can add members later.
                </p>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-1 border rounded-lg p-2">
                  {connections.map((connection) => {
                    const isSelected = selectedMembers.includes(connection.user_id);
                    return (
                      <button
                        key={connection.connection_id}
                        type="button"
                        className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                          isSelected
                            ? "bg-primary/10 border border-primary/30"
                            : "hover:bg-muted/50"
                        }`}
                        onClick={() => toggleMember(connection.user_id)}
                        disabled={isCreating}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={connection.avatar_url} />
                          <AvatarFallback className="text-xs">
                            {getInitials(connection.display_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 text-left min-w-0">
                          <p className="text-sm font-medium truncate">
                            {connection.display_name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            @{connection.username}
                          </p>
                        </div>
                        {isSelected && (
                          <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
              {selectedMembers.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedMembers.length} member{selectedMembers.length !== 1 ? "s" : ""} selected
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              disabled={isCreating}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateGroup}
              disabled={isCreating || !groupName.trim()}
              className="flex-1"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Group
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <InviteShareDialog
        open={shareGroup !== null}
        onOpenChange={(open) => {
          if (!open) setShareGroup(null);
        }}
        type="group_join"
        referenceId={shareGroup?.id || ""}
        name={shareGroup?.name || ""}
      />
    </div>
  );
}
