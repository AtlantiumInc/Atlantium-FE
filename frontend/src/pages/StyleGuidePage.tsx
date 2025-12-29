import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import Dock from "@/components/ui/Dock";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "sonner";
import {
  Home,
  Settings,
  User,
  Bell,
  Check,
  X,
  AlertTriangle,
  Info,
  Mail,
  Lock,
  Search,
  Heart,
  Star,
  Zap,
  Loader2,
  ArrowRight,
  Copy,
  ExternalLink,
  Trash2,
  Edit,
  Plus,
  Minus,
  ChevronRight,
  Menu,
  Sun,
  Moon,
} from "lucide-react";

const colorTokens = [
  { name: "background", var: "bg-background", text: "text-foreground" },
  { name: "foreground", var: "bg-foreground", text: "text-background" },
  { name: "card", var: "bg-card", text: "text-card-foreground" },
  { name: "primary", var: "bg-primary", text: "text-primary-foreground" },
  { name: "secondary", var: "bg-secondary", text: "text-secondary-foreground" },
  { name: "muted", var: "bg-muted", text: "text-muted-foreground" },
  { name: "accent", var: "bg-accent", text: "text-accent-foreground" },
  { name: "destructive", var: "bg-destructive", text: "text-white" },
];

const dockItems = [
  { icon: <Home size={18} />, label: "Home", onClick: () => toast.info("Home") },
  { icon: <Bell size={18} />, label: "Notifications", onClick: () => toast.info("Notifications") },
  { icon: <User size={18} />, label: "Profile", onClick: () => toast.info("Profile") },
  { icon: <Settings size={18} />, label: "Settings", onClick: () => toast.info("Settings") },
];

export function StyleGuidePage() {
  const [switchValue, setSwitchValue] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLoadingDemo = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-32">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Atlantium</h1>
            <p className="text-sm text-muted-foreground">Design System & Style Guide</p>
          </div>
          <ThemeToggle />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-16">

        {/* Brand Section */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Brand</h2>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center">
                  <span className="text-3xl font-bold text-primary-foreground">A</span>
                </div>
                <div>
                  <h3 className="text-3xl font-bold">Atlantium</h3>
                  <p className="text-muted-foreground">Deep jungle green & warm tan</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <Separator />

        {/* Color Palette */}
        <section>
          <h2 className="text-xl font-semibold mb-2">Color Palette</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Core colors that define the Atlantium visual identity.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {colorTokens.map((token) => (
              <div key={token.name} className="space-y-2">
                <div
                  className={`${token.var} ${token.text} h-24 rounded-lg flex items-end p-3 text-sm font-medium border border-border shadow-sm`}
                >
                  {token.name}
                </div>
                <p className="text-xs text-muted-foreground">
                  var(--{token.name})
                </p>
              </div>
            ))}
          </div>
        </section>

        <Separator />

        {/* Typography */}
        <section>
          <h2 className="text-xl font-semibold mb-2">Typography</h2>
          <p className="text-sm text-muted-foreground mb-4">
            JetBrains Mono — A developer-friendly monospace font.
          </p>
          <Card>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Display</p>
                  <h1 className="text-5xl font-bold tracking-tight">Atlantium</h1>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Heading 1</p>
                  <h1 className="text-4xl font-bold">The quick brown fox</h1>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Heading 2</p>
                  <h2 className="text-3xl font-semibold">The quick brown fox</h2>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Heading 3</p>
                  <h3 className="text-2xl font-semibold">The quick brown fox</h3>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Heading 4</p>
                  <h4 className="text-xl font-medium">The quick brown fox</h4>
                </div>
              </div>
              <Separator />
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Body Large</p>
                  <p className="text-lg">
                    The quick brown fox jumps over the lazy dog.
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Body</p>
                  <p className="text-base">
                    The quick brown fox jumps over the lazy dog. Pack my box with
                    five dozen liquor jugs.
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Small</p>
                  <p className="text-sm">
                    The quick brown fox jumps over the lazy dog.
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Muted</p>
                  <p className="text-sm text-muted-foreground">
                    The quick brown fox jumps over the lazy dog.
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Code</p>
                  <code className="text-sm bg-muted px-2 py-1 rounded border">
                    const atlantium = "awesome";
                  </code>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <Separator />

        {/* Buttons */}
        <section>
          <h2 className="text-xl font-semibold mb-2">Buttons</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Interactive elements for user actions.
          </p>
          <Card>
            <CardContent className="pt-6 space-y-6">
              <div>
                <p className="text-xs text-muted-foreground mb-3">Variants</p>
                <div className="flex flex-wrap gap-3">
                  <Button>Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="link">Link</Button>
                  <Button variant="destructive">Destructive</Button>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-3">Sizes</p>
                <div className="flex flex-wrap items-center gap-3">
                  <Button size="sm">Small</Button>
                  <Button size="default">Default</Button>
                  <Button size="lg">Large</Button>
                  <Button size="icon"><Settings size={18} /></Button>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-3">With Icons</p>
                <div className="flex flex-wrap gap-3">
                  <Button><Mail className="mr-2 h-4 w-4" />Email</Button>
                  <Button variant="outline"><Copy className="mr-2 h-4 w-4" />Copy</Button>
                  <Button variant="secondary">Next<ArrowRight className="ml-2 h-4 w-4" /></Button>
                  <Button variant="ghost"><ExternalLink className="mr-2 h-4 w-4" />Open</Button>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-3">States</p>
                <div className="flex flex-wrap gap-3">
                  <Button disabled>Disabled</Button>
                  <Button onClick={handleLoadingDemo} disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isLoading ? "Loading..." : "Click for Loading"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <Separator />

        {/* Form Elements */}
        <section>
          <h2 className="text-xl font-semibold mb-2">Form Elements</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Input components for data collection.
          </p>
          <Card>
            <CardContent className="pt-6 space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="default-input">Default Input</Label>
                  <Input id="default-input" placeholder="Enter text..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-input">With Icon</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="email-input" placeholder="Email" className="pl-10" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-input">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="password-input" type="password" placeholder="Password" className="pl-10" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="search-input">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="search-input" placeholder="Search..." className="pl-10" />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="textarea">Textarea</Label>
                <Textarea id="textarea" placeholder="Enter a longer message..." rows={4} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="disabled-input">Disabled</Label>
                <Input id="disabled-input" placeholder="Disabled input" disabled />
              </div>
              <div className="flex items-center space-x-3">
                <Switch id="switch" checked={switchValue} onCheckedChange={setSwitchValue} />
                <Label htmlFor="switch">Toggle switch ({switchValue ? "On" : "Off"})</Label>
              </div>
            </CardContent>
          </Card>
        </section>

        <Separator />

        {/* Cards */}
        <section>
          <h2 className="text-xl font-semibold mb-2">Cards</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Container components for grouping content.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Default Card</CardTitle>
                <CardDescription>Standard card component</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm">Card content goes here.</p>
              </CardContent>
            </Card>
            <Card className="bg-muted border-0">
              <CardHeader>
                <CardTitle>Muted Card</CardTitle>
                <CardDescription>With muted background</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm">Subtle background variation.</p>
              </CardContent>
            </Card>
            <Card className="border-primary">
              <CardHeader>
                <CardTitle>Highlighted</CardTitle>
                <CardDescription>With primary border</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm">For emphasis.</p>
              </CardContent>
            </Card>
          </div>
        </section>

        <Separator />

        {/* Badges */}
        <section>
          <h2 className="text-xl font-semibold mb-2">Badges</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Status indicators and labels.
          </p>
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-3">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge variant="destructive">Destructive</Badge>
                <Badge className="bg-primary/20 text-primary hover:bg-primary/30">Custom</Badge>
              </div>
              <div className="flex flex-wrap gap-3 mt-4">
                <Badge><Check className="mr-1 h-3 w-3" />Success</Badge>
                <Badge variant="destructive"><X className="mr-1 h-3 w-3" />Error</Badge>
                <Badge variant="secondary"><Loader2 className="mr-1 h-3 w-3 animate-spin" />Loading</Badge>
                <Badge variant="outline"><Star className="mr-1 h-3 w-3" />Featured</Badge>
              </div>
            </CardContent>
          </Card>
        </section>

        <Separator />

        {/* Avatars */}
        <section>
          <h2 className="text-xl font-semibold mb-2">Avatars</h2>
          <p className="text-sm text-muted-foreground mb-4">
            User profile images and initials.
          </p>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>SM</AvatarFallback>
                </Avatar>
                <Avatar className="h-10 w-10">
                  <AvatarFallback>MD</AvatarFallback>
                </Avatar>
                <Avatar className="h-12 w-12">
                  <AvatarFallback>LG</AvatarFallback>
                </Avatar>
                <Avatar className="h-16 w-16">
                  <AvatarFallback>XL</AvatarFallback>
                </Avatar>
                <Avatar className="h-12 w-12">
                  <AvatarImage src="https://github.com/shadcn.png" />
                  <AvatarFallback>CN</AvatarFallback>
                </Avatar>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <div className="flex -space-x-3">
                  <Avatar className="h-10 w-10 border-2 border-background">
                    <AvatarFallback className="bg-primary text-primary-foreground">A</AvatarFallback>
                  </Avatar>
                  <Avatar className="h-10 w-10 border-2 border-background">
                    <AvatarFallback className="bg-secondary">B</AvatarFallback>
                  </Avatar>
                  <Avatar className="h-10 w-10 border-2 border-background">
                    <AvatarFallback className="bg-muted">C</AvatarFallback>
                  </Avatar>
                  <Avatar className="h-10 w-10 border-2 border-background">
                    <AvatarFallback className="bg-accent">+3</AvatarFallback>
                  </Avatar>
                </div>
                <span className="text-sm text-muted-foreground ml-2">Stacked avatars</span>
              </div>
            </CardContent>
          </Card>
        </section>

        <Separator />

        {/* Loading States */}
        <section>
          <h2 className="text-xl font-semibold mb-2">Loading States</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Skeleton placeholders and spinners.
          </p>
          <Card>
            <CardContent className="pt-6 space-y-6">
              <div>
                <p className="text-xs text-muted-foreground mb-3">Skeletons</p>
                <div className="space-y-3">
                  <div className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[200px]" />
                      <Skeleton className="h-4 w-[150px]" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-32 w-full rounded-lg" />
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-3">Spinners</p>
                <div className="flex items-center gap-6">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <Separator />

        {/* Icons */}
        <section>
          <h2 className="text-xl font-semibold mb-2">Icons</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Lucide icons — Consistent icon set.
          </p>
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-6 md:grid-cols-10 gap-4">
                {[Home, Settings, User, Bell, Mail, Lock, Search, Heart, Star, Zap,
                  Check, X, AlertTriangle, Info, ArrowRight, Copy, ExternalLink,
                  Trash2, Edit, Plus, Minus, ChevronRight, Menu, Sun, Moon].map((Icon, i) => (
                  <div key={i} className="flex items-center justify-center h-12 w-12 rounded-lg bg-muted hover:bg-accent transition-colors">
                    <Icon className="h-5 w-5" />
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Using lucide-react — 1000+ icons available
              </p>
            </CardContent>
          </Card>
        </section>

        <Separator />

        {/* Toast Notifications */}
        <section>
          <h2 className="text-xl font-semibold mb-2">Toast Notifications</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Feedback messages using Sonner.
          </p>
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={() => toast.success("Success! Operation completed.")}>
                  <Check className="mr-2 h-4 w-4" />Success
                </Button>
                <Button variant="outline" onClick={() => toast.error("Error! Something went wrong.")}>
                  <X className="mr-2 h-4 w-4" />Error
                </Button>
                <Button variant="outline" onClick={() => toast.warning("Warning! Please check this.")}>
                  <AlertTriangle className="mr-2 h-4 w-4" />Warning
                </Button>
                <Button variant="outline" onClick={() => toast.info("Info: Here's some information.")}>
                  <Info className="mr-2 h-4 w-4" />Info
                </Button>
                <Button variant="outline" onClick={() => toast.promise(
                  new Promise((resolve) => setTimeout(resolve, 2000)),
                  { loading: "Loading...", success: "Done!", error: "Error" }
                )}>
                  <Loader2 className="mr-2 h-4 w-4" />Promise
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        <Separator />

        {/* Borders & Radius */}
        <section>
          <h2 className="text-xl font-semibold mb-2">Border Radius</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Rounded corner variations.
          </p>
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4">
                {["none", "sm", "md", "lg", "xl", "2xl", "full"].map((r) => (
                  <div key={r} className="text-center">
                    <div className={`w-16 h-16 bg-primary rounded-${r} flex items-center justify-center`}>
                      <span className="text-xs text-primary-foreground">{r}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        <Separator />

        {/* Spacing */}
        <section>
          <h2 className="text-xl font-semibold mb-2">Spacing Scale</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Consistent spacing units (4px base).
          </p>
          <Card>
            <CardContent className="pt-6 space-y-2">
              {[1, 2, 3, 4, 6, 8, 10, 12, 16, 20, 24].map((size) => (
                <div key={size} className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground w-16 text-right">
                    {size * 4}px
                  </span>
                  <div className="bg-primary h-3 rounded" style={{ width: `${size * 8}px` }} />
                  <span className="text-xs text-muted-foreground">p-{size}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <Separator />

        {/* Dock */}
        <section>
          <h2 className="text-xl font-semibold mb-2">Dock Component</h2>
          <p className="text-sm text-muted-foreground mb-4">
            macOS-style dock with magnification effect.
          </p>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm mb-4">
                The dock is fixed at the bottom of the screen. Hover over icons to see the magnification effect.
              </p>
              <Button variant="outline" size="sm" onClick={() => toast.info("Look at the bottom of the screen!")}>
                Highlight Dock
              </Button>
            </CardContent>
          </Card>
        </section>

      </div>

      {/* Dock */}
      <Dock
        items={dockItems}
        panelHeight={68}
        baseItemSize={50}
        magnification={70}
      />
    </div>
  );
}
