import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ProfileCard } from "@/components/ProfileCard";
import { ProfileEditForm } from "@/components/ProfileEditForm";
import type { Profile } from "@/components/ProfileCard";

const mockProfiles: Profile[] = [
  {
    id: "1",
    user_id: "u1",
    username: "alexchen",
    display_name: "Alex Chen",
    bio: "Full-stack developer passionate about building scalable systems. Open source contributor and coffee enthusiast.",
    avatar_url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    location: "San Francisco, CA",
    website_url: "https://alexchen.dev",
    created_at: "2024-03-15T10:00:00Z",
  },
  {
    id: "2",
    user_id: "u2",
    username: "sarahm",
    display_name: "Sarah Mitchell",
    bio: "Product designer crafting intuitive experiences. Previously at Stripe and Figma.",
    avatar_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face",
    location: "New York, NY",
    website_url: "https://sarahmitchell.design",
    created_at: "2024-01-20T10:00:00Z",
  },
  {
    id: "3",
    user_id: "u3",
    username: "marcus_dev",
    display_name: "Marcus Johnson",
    bio: "Backend engineer specializing in distributed systems and real-time data processing.",
    location: "Austin, TX",
    created_at: "2024-06-01T10:00:00Z",
  },
  {
    id: "4",
    user_id: "u4",
    username: "emilyw",
    display_name: "Emily Wang",
    avatar_url: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
    created_at: "2024-08-10T10:00:00Z",
  },
];

export function ComponentsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold">Components</h1>
              <p className="text-sm text-muted-foreground">Reusable UI components</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Profile Cards Section */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold">Profile Card</h2>
            <p className="text-muted-foreground mt-1">
              Display user profile information based on the profiles table schema
            </p>
          </div>

          <Separator />

          {/* Default Variant */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Default Variant</h3>
            <p className="text-sm text-muted-foreground">
              Full profile card with avatar, bio, location, website, and join date
            </p>
            <div className="grid gap-6 md:grid-cols-2">
              {mockProfiles.slice(0, 2).map((profile) => (
                <ProfileCard key={profile.id} profile={profile} />
              ))}
            </div>
          </div>

          <Separator />

          {/* Minimal Data */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Minimal Data</h3>
            <p className="text-sm text-muted-foreground">
              Profile cards gracefully handle missing optional fields
            </p>
            <div className="grid gap-6 md:grid-cols-2">
              {mockProfiles.slice(2, 4).map((profile) => (
                <ProfileCard key={profile.id} profile={profile} />
              ))}
            </div>
          </div>

          <Separator />

          {/* Compact Variant */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Compact Variant</h3>
            <p className="text-sm text-muted-foreground">
              Condensed profile display for lists and sidebars
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {mockProfiles.map((profile) => (
                <ProfileCard key={profile.id} profile={profile} variant="compact" />
              ))}
            </div>
          </div>

          <Separator />

          {/* Schema Reference */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Schema Reference</h3>
            <p className="text-sm text-muted-foreground">
              Based on the profiles table structure
            </p>
            <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto">
              <pre>{`interface Profile {
  id: string;          // uuid
  user_id: string;     // uuid (references users)
  username: string;    // unique
  display_name: string;
  first_name?: string;
  last_name?: string;
  bio?: string;
  avatar_url?: string;
  location?: string;
  website_url?: string;
  created_at?: string; // timestamp
  updated_at?: string; // timestamp
}`}</pre>
            </div>
          </div>
        </section>

        <Separator className="my-8" />

        {/* Profile Edit Form Section */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold">Profile Edit Form</h2>
            <p className="text-muted-foreground mt-1">
              Form component for editing user profile information with validation
            </p>
          </div>

          <Separator />

          {/* Default Form */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Default (Empty)</h3>
            <p className="text-sm text-muted-foreground">
              Empty form for new profile creation or editing without initial data
            </p>
            <div className="max-w-2xl">
              <ProfileEditForm />
            </div>
          </div>

          <Separator />

          {/* Pre-filled Form */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Pre-filled</h3>
            <p className="text-sm text-muted-foreground">
              Form with existing profile data pre-populated
            </p>
            <div className="max-w-2xl">
              <ProfileEditForm
                profile={{
                  first_name: "Alex",
                  last_name: "Chen",
                  username: "alexchen",
                  display_name: "Alex Chen",
                  bio: "Full-stack developer passionate about building scalable systems.",
                  location: "San Francisco, CA",
                  website_url: "https://alexchen.dev",
                }}
                onSuccess={(data) => {
                  console.log("Profile updated:", data);
                }}
              />
            </div>
          </div>

          <Separator />

          {/* Features */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Features</h3>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>React Hook Form with Zod validation</li>
              <li>First name and last name fields (optional, max 50 characters)</li>
              <li>Username validation (3-30 characters, alphanumeric and underscores only)</li>
              <li>Display name (required, max 100 characters)</li>
              <li>Bio with character limit (optional, max 500 characters)</li>
              <li>Location field (optional, max 100 characters)</li>
              <li>Website URL with URL validation</li>
              <li>Loading state during form submission</li>
              <li>Success and error toast notifications via Sonner</li>
              <li>Reset button to restore original values</li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
