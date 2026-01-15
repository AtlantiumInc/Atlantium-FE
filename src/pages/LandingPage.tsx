import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import Aurora from "@/components/Aurora";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Calendar,
  Newspaper,
  Briefcase,
  Trophy,
  Users,
  Apple,
} from "lucide-react";

const APP_STORE_URL =
  "https://apps.apple.com/us/app/atlantium-the-frontier/id6757367750";

const valueProps = [
  {
    icon: Calendar,
    title: "Events",
    description: "Community events, workshops, and meetups to grow together.",
  },
  {
    icon: Newspaper,
    title: "Frontier Feed",
    description: "Curated AI and tech news delivered to you daily.",
  },
  {
    icon: Briefcase,
    title: "Services",
    description: "Development, strategy, design, and introductions.",
  },
  {
    icon: Trophy,
    title: "Hackathons",
    description: "Compete, collaborate, and build alongside creators.",
  },
  {
    icon: Users,
    title: "Networking",
    description: "Connect with builders, investors, and industry leaders.",
  },
];

export function LandingPage() {
  const [scrollY, setScrollY] = useState(0);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const auroraColors =
    resolvedTheme === "dark"
      ? ["#34d399", "#10b981", "#059669"] // emerald 400-500-600
      : ["#10b981", "#059669", "#047857"]; // emerald 500-600-700

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          backgroundColor:
            scrollY > 50 ? "hsl(var(--background) / 0.85)" : "transparent",
          backdropFilter: scrollY > 50 ? "blur(20px)" : "none",
          borderBottom:
            scrollY > 50 ? "1px solid hsl(var(--border) / 0.5)" : "none",
        }}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-bold text-primary">Atlantium</span>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link to="/services">
              <Button variant="ghost" size="sm">
                Services
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Aurora Background */}
        <div className="absolute inset-0">
          <Aurora colorStops={auroraColors} amplitude={1.2} blend={0.6} speed={0.8} />
        </div>

        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-transparent to-background z-[1]" />

        {/* Content */}
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center pt-16">
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-6">
            Your Community at{" "}
            <span className="text-primary">The Frontier</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Resources, connections, and opportunities for builders shaping the
            future.
          </p>

          {/* App Store Button */}
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block"
          >
            <div className="inline-flex items-center gap-3 px-8 py-4 bg-card border-2 border-border rounded-xl hover:border-primary/50 hover:shadow-lg transition-all duration-200">
              <Apple className="h-8 w-8" />
              <span className="text-lg font-semibold">Download on App Store</span>
            </div>
          </a>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/50 flex items-start justify-center p-2">
            <div className="w-1 h-2 bg-muted-foreground/50 rounded-full" />
          </div>
        </div>
      </section>

      {/* Value Props Section */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">
            Everything you need to thrive
          </h2>
          <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            Built for builders, by builders. Access the resources and community
            you need to succeed.
          </p>

          {/* Top row - 3 cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-6">
            {valueProps.slice(0, 3).map((prop) => (
              <div
                key={prop.title}
                className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 hover:shadow-lg transition-all duration-200"
              >
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <prop.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{prop.title}</h3>
                <p className="text-muted-foreground">{prop.description}</p>
              </div>
            ))}
          </div>

          {/* Bottom row - 2 cards centered */}
          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {valueProps.slice(3).map((prop) => (
              <div
                key={prop.title}
                className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 hover:shadow-lg transition-all duration-200"
              >
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <prop.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{prop.title}</h3>
                <p className="text-muted-foreground">{prop.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Join the community</h2>
          <p className="text-muted-foreground mb-8">
            Download the app and connect with builders today.
          </p>
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block"
          >
            <Button size="lg" className="gap-2 h-12 px-6">
              <Apple className="h-5 w-5" />
              Download for iOS
            </Button>
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Atlantium. All rights reserved.
          </span>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link
              to="/privacy"
              className="hover:text-foreground transition-colors"
            >
              Privacy
            </Link>
            <Link
              to="/terms"
              className="hover:text-foreground transition-colors"
            >
              Terms
            </Link>
            <a
              href="mailto:team@atlantium.ai"
              className="hover:text-foreground transition-colors"
            >
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
