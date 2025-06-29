import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import NavBar from '@/components/ui/NavBar';
import { Button } from '@/components/ui/button';
import Footer from '@/components/ui/Footer';

const Privacy: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Simple auth token presence check used across static pages
  useEffect(() => {
    const token = localStorage.getItem('kpege-auth-token');
    setIsAuthenticated(!!token);
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Navigation Bar */}
      <NavBar isAuthenticated={isAuthenticated} showFeatures={false} />

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 py-16 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8 text-center">Privacy Policy</h1>

        {/* Introduction */}
        <section className="prose prose-slate max-w-none text-muted-foreground mb-8">
          <p>
            Welcome to KPEGE, a product developed and operated by <strong>IRIRI</strong>
            . Your privacy is important to us. This Privacy Policy explains how we
            collect, use, disclose, and safeguard your information when you visit
            or use our website, mobile application, and related services
            (collectively, the "<strong>Services</strong>").
          </p>
          <p>
            By accessing or using the Services, you agree to the practices
            described in this policy. If you do not agree with the terms of this
            Privacy Policy, please do not access the Services.
          </p>
        </section>

        {/* Information We Collect */}
        <section className="prose prose-slate max-w-none text-muted-foreground mb-8">
          <h2>1. Information We Collect</h2>
          <h3 className="mt-4">1.1 Information You Provide to Us</h3>
          <ul className="list-disc pl-6">
            <li>
              <strong>Account Information:</strong> When you create an account,
              we collect your name, email address, password, and other
              information you choose to provide.
            </li>
            <li>
              <strong>Financial Data:</strong> If you use budgeting or expense
              tracking features, you may voluntarily provide transaction
              details, account balances, or receipts.
            </li>
            <li>
              <strong>Support & Feedback:</strong> When you contact support or
              submit feedback, we collect the content of your message and any
              additional information you choose to provide.
            </li>
          </ul>

          <h3 className="mt-4">1.2 Information Collected Automatically</h3>
          <ul className="list-disc pl-6">
            <li>
              <strong>Usage Data:</strong> We automatically collect information
              about your interactions with the Services, including pages
              visited, features used, referral source, and the date/time of each
              visit.
            </li>
            <li>
              <strong>Device & Log Data:</strong> We collect information from
              your device such as IP address, browser type, device identifiers,
              operating system, and crash logs.
            </li>
            <li>
              <strong>Cookies & Similar Technologies:</strong> We use cookies and
              local storage to remember your preferences and authenticate your
              session. You can control cookies through your browser settings.
            </li>
          </ul>
        </section>

        {/* Use of Information */}
        <section className="prose prose-slate max-w-none text-muted-foreground mb-8">
          <h2>2. How We Use Your Information</h2>
          <ul className="list-disc pl-6">
            <li>Provide, operate, and maintain the Services.</li>
            <li>Personalize your experience and deliver tailored insights.</li>
            <li>Process transactions and send related information.</li>
            <li>Respond to comments, questions, and provide customer support.</li>
            <li>Improve, test, and monitor the effectiveness of our Services.</li>
            <li>Detect, prevent, and address technical issues or fraud.</li>
            <li>Send you service-related notices and marketing (with consent).</li>
            <li>Comply with legal obligations.</li>
          </ul>
        </section>

        {/* Sharing of Information */}
        <section className="prose prose-slate max-w-none text-muted-foreground mb-8">
          <h2>3. How We Share Your Information</h2>
          <p>
            We do <strong>not</strong> sell your personal data. We may share
            information in the following circumstances:
          </p>
          <ul className="list-disc pl-6">
            <li>
              <strong>Service Providers:</strong> We share information with
              trusted third-party vendors who perform services for us (e.g.
              analytics, cloud hosting, customer support) under confidentiality
              agreements.
            </li>
            <li>
              <strong>Legal & Safety:</strong> We may disclose information if
              required by law or to protect the rights, property, or safety of
              IRIRI, our users, or others.
            </li>
            <li>
              <strong>Business Transfers:</strong> In connection with a merger,
              acquisition, or asset sale, your information may be transferred
              subject to commitments of confidentiality.
            </li>
          </ul>
        </section>

        {/* Security */}
        <section className="prose prose-slate max-w-none text-muted-foreground mb-8">
          <h2>4. Security</h2>
          <p>
            We use industry-standard administrative, technical, and physical
            safeguards to protect your information. However, no method of
            transmission over the Internet or electronic storage is completely
            secure, and we cannot guarantee absolute security.
          </p>
        </section>

        {/* Your Choices */}
        <section className="prose prose-slate max-w-none text-muted-foreground mb-8">
          <h2>5. Your Choices & Rights</h2>
          <ul className="list-disc pl-6">
            <li>Access, update, or delete your account information at any time.</li>
            <li>Opt-out of marketing emails by following the unsubscribe link.</li>
            <li>
              Disable cookies through your browser settings (may impact
              functionality).
            </li>
            <li>
              If you are in a jurisdiction with data protection laws (e.g., GDPR
              or CCPA), you may have additional rights related to your personal
              data.
            </li>
          </ul>
        </section>

        {/* Children's Privacy */}
        <section className="prose prose-slate max-w-none text-muted-foreground mb-8">
          <h2>6. Children's Privacy</h2>
          <p>
            KPEGE is not directed to individuals under 13. We do not knowingly
            collect personal information from children. If we become aware that
            we have collected such information, we will delete it promptly.
          </p>
        </section>

        {/* Changes */}
        <section className="prose prose-slate max-w-none text-muted-foreground mb-8">
          <h2>7. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify
            you of any material changes by posting the new policy on this page
            and updating the "Last Updated" date below.
          </p>
        </section>

        {/* Contact */}
        <section className="prose prose-slate max-w-none text-muted-foreground mb-8">
          <h2>8. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy or our privacy
            practices, please contact us at
            <a href="mailto:privacy@kpege.com" className="text-green-700 ml-1">
              privacy@kpege.com
            </a>
            .
          </p>
        </section>

        <p className="text-sm text-muted-foreground text-right">Last Updated:
          June 29, 2025</p>

        <div className="mt-12 text-center">
          <Link to="/" className="inline-block">
            <Button className="bg-green-700 hover:bg-green-800 text-white">
              Return to Homepage
            </Button>
          </Link>
        </div>
      </main>

      {/* Simple Footer (will be replaced by shared footer in later task) */}
      <Footer />
    </div>
  );
};

export default Privacy; 