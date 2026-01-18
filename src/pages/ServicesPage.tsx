import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Code,
  Lightbulb,
  Handshake,
  Palette,
  ChevronDown,
} from "lucide-react";

const services = [
  {
    icon: Code,
    title: "Development",
    description:
      "Build robust, scalable software solutions tailored to your business needs.",
    items: [
      { name: "Enterprise grade software development" },
      { name: "Refactor legacy systems" },
      { name: "Accelerated MVP development", note: "Requires GTM Strategy service" },
      { name: "System integration" },
    ],
  },
  {
    icon: Lightbulb,
    title: "Strategy",
    description:
      "Strategic guidance to help you navigate the technology landscape and reach your goals.",
    items: [
      { name: "GTM Playbook" },
      { name: "AI consultation" },
    ],
  },
  {
    icon: Handshake,
    title: "Introductions",
    description:
      "Connect with the right people to accelerate your growth and expand your network.",
    items: [
      { name: "Partnership introductions", note: "Connect with potential business partners and collaborators" },
    ],
  },
  {
    icon: Palette,
    title: "Design",
    description:
      "Create intuitive, beautiful experiences that delight your users.",
    items: [
      { name: "UI/UX guidance" },
    ],
  },
];

export function ServicesPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToServices = () => {
    document.getElementById("services-section")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Navigation */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
        style={{
          backgroundColor: scrollY > 100 ? "rgba(0,0,0,0.85)" : "transparent",
          backdropFilter: scrollY > 100 ? "blur(20px)" : "none",
          borderBottom: scrollY > 100 ? "1px solid rgba(255,255,255,0.1)" : "none",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="group">
            <span className="text-2xl font-black tracking-tighter text-white drop-shadow-lg transition-all duration-300 group-hover:tracking-normal">
              ATLANTIUM
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link to="/services">
              <Button
                variant="ghost"
                size="sm"
                className="text-white/90 hover:text-white hover:bg-white/10"
              >
                Services
              </Button>
            </Link>
            <Link to="/login">
              <Button
                variant="ghost"
                size="sm"
                className="text-white/90 hover:text-white hover:bg-white/10"
              >
                Sign In
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button
                size="sm"
                className="bg-white text-black hover:bg-white/90 font-semibold"
              >
                Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section - Full Screen Video */}
      <section className="relative h-screen flex flex-col items-center justify-center overflow-hidden">
        {/* Video Background */}
        <div className="absolute inset-0 z-0">
          <video
            ref={videoRef}
            autoPlay
            muted
            loop
            playsInline
            onLoadedData={() => setIsVideoLoaded(true)}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
              isVideoLoaded ? "opacity-100" : "opacity-0"
            }`}
            style={{ filter: "brightness(0.4) contrast(1.1)" }}
          >
            <source
              src="https://videos.pexels.com/video-files/3129671/3129671-uhd_2560_1440_30fps.mp4"
              type="video/mp4"
            />
          </video>

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70" />
        </div>

        {/* Hero Content */}
        <div
          className="relative z-10 max-w-5xl mx-auto px-6 text-center"
          style={{
            transform: `translateY(${scrollY * 0.3}px)`,
            opacity: Math.max(0, 1 - scrollY / 600),
          }}
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-md border border-white/10 mb-8 animate-fade-in">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-sm text-white/80 font-medium">
              Now accepting new clients
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter text-white mb-6 leading-[0.85]">
            <span className="block animate-slide-up" style={{ animationDelay: "0.1s" }}>
              BUILD THE
            </span>
            <span
              className="block bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent animate-slide-up"
              style={{ animationDelay: "0.2s" }}
            >
              FUTURE
            </span>
          </h1>

          {/* Subheadline */}
          <p
            className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-12 font-light animate-fade-in"
            style={{ animationDelay: "0.4s" }}
          >
            Atlantium partners with visionary businesses to architect, build, and scale
            transformative technology solutions.
          </p>

          {/* CTA Buttons */}
          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fade-in"
            style={{ animationDelay: "0.5s" }}
          >
            <a href="mailto:team@atlantium.ai">
              <Button
                size="lg"
                className="bg-white text-black hover:bg-white/90 font-bold text-lg px-8 py-6 shadow-2xl shadow-white/20 hover:scale-105 transition-transform"
              >
                Start a Project
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </a>
            <Button
              size="lg"
              variant="outline"
              onClick={scrollToServices}
              className="border-white/30 text-white hover:bg-white/10 font-semibold text-lg px-8 py-6"
            >
              Explore Services
            </Button>
          </div>
        </div>

        {/* Scroll Indicator - Fixed at bottom */}
        <button
          onClick={scrollToServices}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1 text-white/40 hover:text-white/70 transition-colors"
        >
          <span className="text-[10px] uppercase tracking-[0.2em]">Scroll</span>
          <ChevronDown className="h-4 w-4 animate-bounce" />
        </button>
      </section>

      {/* Services Section - Simplified */}
      <section id="services-section" className="py-24 bg-background">
        <div className="max-w-6xl mx-auto px-6">
          {/* Section Header */}
          <div className="mb-16">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
              Our <span className="text-primary">Services</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl">
              End-to-end solutions for ambitious teams.
            </p>
          </div>

          {/* Services Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            {services.map((service) => (
              <div
                key={service.title}
                className="group bg-card border border-border rounded-2xl p-8 hover:border-primary/30 transition-colors"
              >
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                  <service.icon className="h-6 w-6 text-primary" />
                </div>

                <h3 className="text-2xl font-bold mb-3">{service.title}</h3>
                <p className="text-muted-foreground mb-6">{service.description}</p>

                <ul className="space-y-3">
                  {service.items.map((item) => (
                    <li key={item.name} className="flex items-start gap-3">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                      <div>
                        <span className="text-foreground">{item.name}</span>
                        {item.note && (
                          <span className="block text-sm text-muted-foreground mt-0.5">
                            {item.note}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section - Simplified */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to get started?
          </h2>
          <p className="text-muted-foreground mb-8">
            Let's discuss how Atlantium can help your business grow.
          </p>
          <a href="mailto:team@atlantium.ai">
            <Button size="lg" className="font-semibold">
              Contact Us
              <ArrowRight className="ml-2 h-4 w-4" />
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
            <Link to="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">
              Terms
            </Link>
            <a href="mailto:team@atlantium.ai" className="hover:text-foreground transition-colors">
              Contact
            </a>
          </div>
        </div>
      </footer>

      {/* Animations */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(100%);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 1s ease-out forwards;
          opacity: 0;
        }

        .animate-slide-up {
          animation: slide-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}
