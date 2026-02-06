"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import NoiseBackground from "@/components/ui/noise-background";

export default function PrivacyPolicy() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-zinc-100 relative">
      <div className="fixed inset-0 z-0">
        <NoiseBackground />
      </div>
      <div className="max-w-3xl mx-auto px-6 py-12 relative z-10">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-8 text-zinc-400 hover:text-zinc-100 -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <h1 className="text-4xl font-light tracking-tight mb-8">Privacy Policy</h1>

        <p className="text-zinc-400 mb-8">Last updated: December 2025</p>

        <div className="space-y-8 text-zinc-300">
          <section>
            <h2 className="text-xl font-medium text-zinc-100 mb-3">1. Introduction</h2>
            <p>
              Welcome to Prompt Architect. We respect your privacy and are committed to protecting your personal data.
              This privacy policy explains how we collect, use, and safeguard your information when you use our service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-zinc-100 mb-3">2. Information We Collect</h2>
            <p className="mb-3">We collect the following types of information:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong className="text-zinc-100">Account Information:</strong> When you sign in with Google, we receive your email address and basic profile information.</li>
              <li><strong className="text-zinc-100">Prompt Data:</strong> The ideas and descriptions you submit to generate prompts.</li>
              <li><strong className="text-zinc-100">Generated Content:</strong> The AI-generated prompts and specifications created for you.</li>
              <li><strong className="text-zinc-100">Usage Data:</strong> Information about how you interact with our service.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium text-zinc-100 mb-3">3. How We Use Your Information</h2>
            <p className="mb-3">We use your information to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Provide and improve our prompt generation service</li>
              <li>Process your ideas through AI to create production-ready prompts</li>
              <li>Save your session history for your convenience</li>
              <li>Authenticate your account and maintain security</li>
              <li>Communicate with you about service updates</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium text-zinc-100 mb-3">4. AI Processing</h2>
            <p>
              Your submitted ideas are processed by AI models to generate prompts optimized for coding agents like Claude and Cursor.
              This processing is essential to our service. We do not use your individual prompts to train AI models.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-zinc-100 mb-3">5. Data Storage and Security</h2>
            <p>
              Your data is stored securely using industry-standard encryption and security practices.
              We use Supabase for authentication and data storage, which provides enterprise-grade security.
              We retain your data for as long as your account is active or as needed to provide you services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-zinc-100 mb-3">6. Third-Party Services</h2>
            <p className="mb-3">We use the following third-party services:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong className="text-zinc-100">Google OAuth:</strong> For authentication</li>
              <li><strong className="text-zinc-100">Supabase:</strong> For data storage and authentication</li>
              <li><strong className="text-zinc-100">AI Providers:</strong> For prompt generation and processing</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium text-zinc-100 mb-3">7. Your Rights</h2>
            <p className="mb-3">You have the right to:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Export your data in a portable format</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-medium text-zinc-100 mb-3">8. Cookies</h2>
            <p>
              We use essential cookies to maintain your session and authentication state.
              These cookies are necessary for the service to function properly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-zinc-100 mb-3">9. Changes to This Policy</h2>
            <p>
              We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page
              and updating the &quot;Last updated&quot; date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-zinc-100 mb-3">10. Contact Us</h2>
            <p>
              If you have any questions about this privacy policy or our data practices, please contact us at{" "}
              <a href="mailto:support@promptarchitect.com" className="text-amber-500 hover:text-amber-400">
                support@promptarchitect.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
