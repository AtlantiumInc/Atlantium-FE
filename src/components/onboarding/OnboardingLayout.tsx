import type { ReactNode } from "react";
import { motion } from "motion/react";
import { LogOut } from "lucide-react";
import { ThemeToggle } from "../ThemeToggle";
import { Button } from "../ui/button";

interface OnboardingLayoutProps {
  children: ReactNode;
  preview: ReactNode;
  progress: ReactNode;
  wide?: boolean;
  onLogout?: () => void;
}

export function OnboardingLayout({
  children,
  preview,
  progress,
  wide = false,
  onLogout,
}: OnboardingLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header with logo and progress */}
      <header className="fixed top-0 left-0 right-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold">Atlantium</span>
          </div>
          <div className="flex-1 max-w-md mx-4">{progress}</div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {onLogout && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onLogout}
                className="text-muted-foreground hover:text-destructive"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Logout
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main content area */}
      <main className="pt-16 min-h-screen">
        <div className="flex flex-col lg:flex-row min-h-[calc(100vh-4rem)]">
          {/* Left panel - Form */}
          <motion.div
            className="flex-1 flex items-center justify-center p-6 lg:p-12"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className={wide ? "w-full max-w-4xl" : "w-full max-w-md"}>{children}</div>
          </motion.div>

          {/* Right panel - Preview (hidden on mobile) */}
          <div className="hidden lg:flex flex-1 items-center justify-center bg-muted/30 border-l border-border p-6 lg:p-12">
            <div className="w-full max-w-sm">{preview}</div>
          </div>
        </div>
      </main>
    </div>
  );
}
