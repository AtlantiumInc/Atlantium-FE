import { Mail, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AccessPendingOverlayProps {
  onLogout: () => Promise<void>;
}

export function AccessPendingOverlay({ onLogout }: AccessPendingOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 text-center py-12">
        {/* Icon with pulsing background */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg animate-pulse" />
            <div className="relative bg-primary/10 rounded-full p-4 border border-primary/30">
              <Mail className="h-8 w-8 text-primary" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
            Access Pending
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Your application is being reviewed. Our team will contact you shortly with next steps.
          </p>
        </div>

        {/* Info box */}
        <div className="bg-background/50 border border-border/30 rounded-lg p-4 text-sm text-muted-foreground space-y-2">
          <p>
            Check your email at <span className="font-medium text-foreground block mt-1">{localStorage.getItem("userEmail") || "your email"}</span>
          </p>
          <p className="text-xs pt-2">
            Contact <span className="font-medium text-foreground">team@atlantium.ai</span> if you have any questions
          </p>
        </div>

        {/* Logout button */}
        <Button
          onClick={onLogout}
          variant="outline"
          className="w-full gap-2"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  );
}
