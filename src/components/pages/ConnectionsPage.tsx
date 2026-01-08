import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  UserPlus,
  MessageCircle,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import { Connection, ConnectionInvitation } from "@/lib/types";

export function ConnectionsPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [receivedInvitations, setReceivedInvitations] = useState<ConnectionInvitation[]>([]);
  const [sentInvitations, setSentInvitations] = useState<ConnectionInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActioning, setIsActioning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [connectionsRes, invitationsRes] = await Promise.all([
        api.getConnections(),
        api.getConnectionInvitations(),
      ]);

      setConnections(connectionsRes.connections || []);
      setReceivedInvitations(invitationsRes.received || []);
      setSentInvitations(invitationsRes.sent || []);
    } catch (error) {
      console.error("Failed to fetch connections:", error);
      setError("Failed to load connections. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAcceptInvitation = async (invitationId: string) => {
    try {
      setIsActioning(true);
      await api.acceptConnectionInvitation(invitationId);
      await fetchData();
    } catch (error) {
      console.error("Failed to accept invitation:", error);
      setError("Failed to accept invitation. Please try again.");
    } finally {
      setIsActioning(false);
    }
  };

  const handleDeclineInvitation = async (invitationId: string) => {
    try {
      setIsActioning(true);
      await api.declineConnectionInvitation(invitationId);
      await fetchData();
    } catch (error) {
      console.error("Failed to decline invitation:", error);
      setError("Failed to decline invitation. Please try again.");
    } finally {
      setIsActioning(false);
    }
  };

  const handleStartMessage = (connection: Connection) => {
    setSelectedConnection(connection);
    setIsMessageDialogOpen(true);
  };

  const handleCreateThread = async () => {
    if (!selectedConnection) return;

    try {
      setIsActioning(true);
      const result = await api.createDirectThread(selectedConnection.user_id);
      setIsMessageDialogOpen(false);
      setSelectedConnection(null);
      // Navigate to messages page with the thread (would need routing setup)
      window.location.href = `/messages?thread=${result.thread_id}`;
    } catch (error) {
      console.error("Failed to create message thread:", error);
      setError("Failed to start conversation. Please try again.");
    } finally {
      setIsActioning(false);
    }
  };

  const getInitials = (displayName: string) => {
    return displayName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
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
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <UserPlus className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Connections</h2>
          <p className="text-sm text-muted-foreground">
            Manage your connections and invitations
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-destructive/10 text-destructive rounded-lg">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="connections" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="connections">
            Connections ({connections.length})
          </TabsTrigger>
          <TabsTrigger value="received">
            Received ({receivedInvitations.length})
          </TabsTrigger>
          <TabsTrigger value="sent">
            Sent ({sentInvitations.length})
          </TabsTrigger>
        </TabsList>

        {/* Connections Tab */}
        <TabsContent value="connections" className="space-y-4">
          {connections.length === 0 ? (
            <div className="text-center py-12">
              <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No connections yet</h3>
              <p className="text-sm text-muted-foreground">
                Send invitations to start connecting with other users
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {connections.map((connection) => (
                <Card key={connection.connection_id} className="hover:bg-accent transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <Avatar>
                          <AvatarImage src={connection.avatar_url} />
                          <AvatarFallback>
                            {getInitials(connection.display_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold truncate">
                            {connection.display_name}
                          </h4>
                          <p className="text-xs text-muted-foreground truncate">
                            @{connection.username}
                          </p>
                          {connection.bio && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                              {connection.bio}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      {connection.chat_enabled && (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleStartMessage(connection)}
                          disabled={isActioning}
                          className="flex-1"
                        >
                          {isActioning ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <MessageCircle className="h-4 w-4 mr-2" />
                              Message
                            </>
                          )}
                        </Button>
                      )}
                      {!connection.chat_enabled && (
                        <div className="text-xs text-muted-foreground w-full text-center py-2">
                          Messaging disabled
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Received Invitations Tab */}
        <TabsContent value="received" className="space-y-4">
          {receivedInvitations.length === 0 ? (
            <div className="text-center py-12">
              <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No pending invitations</h3>
              <p className="text-sm text-muted-foreground">
                You'll see connection invitations here
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {receivedInvitations.map((invitation) => (
                <Card key={invitation.invitation_id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1">
                        <Avatar>
                          <AvatarImage src={invitation.avatar_url} />
                          <AvatarFallback>
                            {getInitials(invitation.display_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold truncate">
                            {invitation.display_name}
                          </h4>
                          <p className="text-xs text-muted-foreground truncate">
                            @{invitation.username}
                          </p>
                          {invitation.bio && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                              {invitation.bio}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() =>
                          handleAcceptInvitation(invitation.invitation_id)
                        }
                        disabled={isActioning}
                        className="flex-1"
                      >
                        {isActioning ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Accept
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleDeclineInvitation(invitation.invitation_id)
                        }
                        disabled={isActioning}
                        className="flex-1"
                      >
                        {isActioning ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 mr-2" />
                            Decline
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Sent Invitations Tab */}
        <TabsContent value="sent" className="space-y-4">
          {sentInvitations.length === 0 ? (
            <div className="text-center py-12">
              <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No pending invitations sent</h3>
              <p className="text-sm text-muted-foreground">
                Invitations you've sent will appear here
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {sentInvitations.map((invitation) => (
                <Card key={invitation.invitation_id} className="opacity-75">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar>
                        <AvatarImage src={invitation.avatar_url} />
                        <AvatarFallback>
                          {getInitials(invitation.display_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold truncate">
                          {invitation.display_name}
                        </h4>
                        <p className="text-xs text-muted-foreground truncate">
                          @{invitation.username}
                        </p>
                        {invitation.bio && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {invitation.bio}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 p-2 bg-muted rounded text-xs text-center text-muted-foreground">
                      Invitation pending
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Message Dialog */}
      <Dialog open={isMessageDialogOpen} onOpenChange={setIsMessageDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Start Conversation</DialogTitle>
            <DialogDescription>
              Send your first message to {selectedConnection?.display_name}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-3 py-4">
            <Avatar>
              <AvatarImage src={selectedConnection?.avatar_url} />
              <AvatarFallback>
                {selectedConnection && getInitials(selectedConnection.display_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h4 className="font-semibold">{selectedConnection?.display_name}</h4>
              <p className="text-sm text-muted-foreground">
                @{selectedConnection?.username}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsMessageDialogOpen(false)}
              disabled={isActioning}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateThread} disabled={isActioning}>
              {isActioning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Start Conversation
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
