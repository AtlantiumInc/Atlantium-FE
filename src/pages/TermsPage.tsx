import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";

const sections = [
  {
    title: "1. Acceptance of Terms",
    content: [
      {
        text: "By accessing or using Atlantium's mobile application, website, and related services (collectively, the \"Service\"), you agree to be bound by these Terms and Conditions. If you do not agree to these terms, do not use the Service.",
      },
    ],
  },
  {
    title: "2. Eligibility",
    content: [
      { text: "You must be at least 13 years of age to use the Service." },
      { text: "You must provide accurate and complete information when creating an account." },
      { text: "You are responsible for maintaining the confidentiality of your account credentials." },
    ],
  },
  {
    title: "3. User Accounts",
    content: [
      {
        subtitle: "Account Creation",
        text: "You may need to create an account to access certain features. You agree to provide accurate information and keep it updated.",
      },
      {
        subtitle: "Account Security",
        text: "You are responsible for all activities that occur under your account. Notify us immediately of any unauthorized use.",
      },
      {
        subtitle: "Account Termination",
        text: "We reserve the right to suspend or terminate accounts that violate these terms or for any other reason at our sole discretion.",
      },
    ],
  },
  {
    title: "4. Acceptable Use",
    content: [
      { text: "Do not use the Service for any illegal or unauthorized purpose." },
      { text: "Do not harass, abuse, or harm other users." },
      { text: "Do not post false, misleading, or deceptive content." },
      { text: "Do not attempt to gain unauthorized access to our systems or other users' accounts." },
      { text: "Do not use automated systems or bots to access the Service without permission." },
      { text: "Do not interfere with or disrupt the Service or servers." },
    ],
  },
  {
    title: "5. User Content",
    content: [
      {
        subtitle: "Ownership",
        text: "You retain ownership of content you submit to the Service. By posting content, you grant us a non-exclusive, worldwide, royalty-free license to use, display, and distribute your content in connection with the Service.",
      },
      {
        subtitle: "Responsibility",
        text: "You are solely responsible for content you post. We do not endorse user content and are not liable for any content posted by users.",
      },
      {
        subtitle: "Removal",
        text: "We may remove any content that violates these terms or that we deem inappropriate at our sole discretion.",
      },
    ],
  },
  {
    title: "6. Intellectual Property",
    content: [
      {
        text: "The Service and its original content, features, and functionality are owned by Atlantium and are protected by international copyright, trademark, and other intellectual property laws.",
      },
      {
        text: "You may not copy, modify, distribute, sell, or lease any part of the Service without our prior written consent.",
      },
    ],
  },
  {
    title: "7. Third-Party Services",
    content: [
      {
        text: "The Service may integrate with third-party services such as GitHub and payment processors. Your use of these services is subject to their respective terms and privacy policies.",
      },
      {
        text: "We are not responsible for the content, privacy practices, or availability of third-party services.",
      },
    ],
  },
  {
    title: "8. Events and Community",
    content: [
      {
        subtitle: "Event Participation",
        text: "By RSVPing to events through the Service, you agree to abide by event-specific rules and conduct yourself professionally.",
      },
      {
        subtitle: "Community Standards",
        text: "Users are expected to maintain respectful and professional interactions with other community members.",
      },
    ],
  },
  {
    title: "9. Disclaimers",
    content: [
      {
        text: "THE SERVICE IS PROVIDED \"AS IS\" AND \"AS AVAILABLE\" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED.",
      },
      {
        text: "We do not warrant that the Service will be uninterrupted, secure, or error-free.",
      },
      {
        text: "We are not responsible for any loss or damage resulting from your use of the Service.",
      },
    ],
  },
  {
    title: "10. Limitation of Liability",
    content: [
      {
        text: "To the maximum extent permitted by law, Atlantium shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues.",
      },
      {
        text: "Our total liability for any claims arising from your use of the Service is limited to the amount you paid us, if any, in the past 12 months.",
      },
    ],
  },
  {
    title: "11. Indemnification",
    content: [
      {
        text: "You agree to indemnify and hold harmless Atlantium, its officers, directors, employees, and agents from any claims, damages, losses, or expenses arising from your use of the Service or violation of these terms.",
      },
    ],
  },
  {
    title: "12. Changes to Terms",
    content: [
      {
        text: "We may modify these Terms at any time. We will notify users of material changes by posting the updated terms and updating the \"Last updated\" date. Continued use of the Service after changes constitutes acceptance of the new terms.",
      },
    ],
  },
  {
    title: "13. Governing Law",
    content: [
      {
        text: "These Terms shall be governed by and construed in accordance with the laws of the United States, without regard to conflict of law provisions.",
      },
    ],
  },
];

export function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
            <img src="/logo.png" alt="Atlantium" className="h-6 w-6" />
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
            <h1 className="text-4xl font-bold mb-3">Terms and Conditions</h1>
            <p className="text-muted-foreground">
              Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>

          {/* Intro */}
          <p className="text-lg text-muted-foreground mb-10">
            Welcome to Atlantium. These Terms and Conditions govern your use of our platform and services. Please read them carefully before using the Service.
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
              <h2 className="text-xl font-semibold mb-4">14. Contact Us</h2>
              <p className="text-muted-foreground mb-4">
                If you have any questions about these Terms and Conditions, please contact us at:
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
          <div className="mt-16 pt-8 border-t border-border flex gap-4">
            <Link to="/">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </Link>
            <Link to="/privacy">
              <Button variant="ghost">
                Privacy Policy
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
