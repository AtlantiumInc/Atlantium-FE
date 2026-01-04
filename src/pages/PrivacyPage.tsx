import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";

const sections = [
  {
    title: "1. Information We Collect",
    content: [
      {
        subtitle: "Account Information",
        text: "When you create an account, we collect your email address and any profile information you choose to provide, such as your name, avatar, and bio.",
      },
      {
        subtitle: "GitHub Data",
        text: "If you connect your GitHub account, we access your public profile information and contribution data to display on community leaderboards.",
      },
      {
        subtitle: "Device Information",
        text: "We automatically collect device type, operating system, unique device identifiers, and push notification tokens if you enable notifications.",
      },
      {
        subtitle: "Usage Data",
        text: "We collect information about how you interact with the Service, including pages viewed, features used, and event RSVPs.",
      },
    ],
  },
  {
    title: "2. How We Use Your Information",
    content: [
      { text: "Provide, maintain, and improve the Service" },
      { text: "Create and manage your account" },
      { text: "Send notifications about events, updates, and community activity" },
      { text: "Display leaderboards and community rankings" },
      { text: "Respond to inquiries and provide support" },
      { text: "Detect and prevent fraud or abuse" },
    ],
  },
  {
    title: "3. Information Sharing",
    content: [
      {
        subtitle: "Public Profile",
        text: "Your display name, avatar, and GitHub username (if connected) may be visible to other users on leaderboards and event attendee lists.",
      },
      {
        subtitle: "Service Providers",
        text: "We may share information with third-party vendors who perform services on our behalf, including hosting and analytics.",
      },
      {
        subtitle: "Legal Requirements",
        text: "We may disclose information if required by law or to protect our rights and safety.",
      },
    ],
  },
  {
    title: "4. Third-Party Services",
    content: [
      { subtitle: "GitHub", text: "Authentication and contribution tracking" },
      { subtitle: "OneSignal", text: "Push notification delivery" },
      { subtitle: "Xano", text: "Backend services and data storage" },
    ],
  },
  {
    title: "5. Data Security",
    content: [
      {
        text: "We implement appropriate technical and organizational measures to protect your personal information. However, no method of transmission over the Internet is 100% secure.",
      },
    ],
  },
  {
    title: "6. Your Rights",
    content: [
      { text: "Access the personal information we hold about you" },
      { text: "Request correction of inaccurate information" },
      { text: "Request deletion of your account and data" },
      { text: "Opt out of push notifications at any time" },
      { text: "Export your data in a portable format" },
    ],
  },
  {
    title: "7. Data Retention",
    content: [
      {
        text: "We retain your information for as long as your account is active. You may request deletion of your account and associated data at any time through the app settings.",
      },
    ],
  },
  {
    title: "8. Children's Privacy",
    content: [
      {
        text: "The Service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13.",
      },
    ],
  },
  {
    title: "9. Changes to This Policy",
    content: [
      {
        text: "We may update this Privacy Policy from time to time. We will notify you of changes by posting the new policy and updating the \"Last updated\" date.",
      },
    ],
  },
];

export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
            <span className="text-xl font-bold text-primary">Atlantium</span>
          </Link>
          <ThemeToggle />
        </div>
      </nav>

      {/* Content */}
      <main className="pt-24 pb-16 px-6">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-4xl font-bold mb-3">Privacy Policy</h1>
            <p className="text-muted-foreground">
              Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>

          {/* Intro */}
          <p className="text-lg text-muted-foreground mb-10">
            Atlantium ("we," "our," or "us") is committed to protecting your privacy. This policy explains how we collect, use, and safeguard your information when you use our mobile application and website.
          </p>

          {/* Sections */}
          <div className="space-y-10">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-xl font-semibold mb-4">{section.title}</h2>
                <div className="space-y-3">
                  {section.content.map((item, index) => (
                    <div key={index} className="text-muted-foreground">
                      {"subtitle" in item && item.subtitle ? (
                        <p>
                          <span className="font-medium text-foreground">{item.subtitle}:</span>{" "}
                          {item.text}
                        </p>
                      ) : (
                        <p className="flex items-start gap-2">
                          <span className="text-primary mt-1.5">•</span>
                          {item.text}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ))}

            {/* Contact */}
            <section>
              <h2 className="text-xl font-semibold mb-4">10. Contact Us</h2>
              <p className="text-muted-foreground mb-4">
                If you have questions about this Privacy Policy or our data practices, contact us at:
              </p>
              <a
                href="mailto:team@atlantium.ai"
                className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
              >
                team@atlantium.ai
              </a>
            </section>
          </div>

          {/* Back Button */}
          <div className="mt-16 pt-8 border-t border-border">
            <Link to="/">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
