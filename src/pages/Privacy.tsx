import React from 'react';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white shadow-md rounded-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy for Cleany</h1>
        <p className="text-sm text-gray-500 mb-8">Last Updated: [Insert Date]</p>

        <div className="space-y-8 text-gray-700 leading-relaxed">
          
          {/* Section 1 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Introduction</h2>
            <p className="mb-4">
              Welcome to <strong>Cleany</strong> ("we," "our," or "us"). Cleany is a web application designed to help users organize, manage, and clean their email inboxes through integration with Google's Gmail services.
            </p>
            <p className="mb-4">
              We respect your privacy and are committed to protecting the personal information you share with us. This Privacy Policy explains what information we collect, how we use it, and the rights you have regarding your data.
            </p>
            <p>
              By using Cleany, you agree to the collection and use of information in accordance with this policy.
            </p>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Information We Collect</h2>
            <p className="mb-4">To provide our inbox cleaning services, we require access to certain data from your Google account.</p>
            
            <h3 className="font-medium text-gray-900 mt-4 mb-2">A. Google User Data (Gmail API)</h3>
            <p className="mb-2">By granting Cleany permissions via Google OAuth, you authorize us to access specific information. Depending on the scopes you grant, this may include:</p>
            <ul className="list-disc pl-5 space-y-1 mb-4">
              <li><strong>Read Access:</strong> Reading email headers (sender, subject, date) and bodies to help you filter and identify unwanted emails.</li>
              <li><strong>Write/Delete Access:</strong> Moving emails to trash, permanently deleting messages, or applying labels/tags based on your instructions.</li>
              <li><strong>Profile Information:</strong> Your email address and basic profile info to create and authenticate your user session.</li>
            </ul>

            <h3 className="font-medium text-gray-900 mt-4 mb-2">B. Log and Usage Data</h3>
            <p className="mb-2">When you visit our web application, we may automatically collect standard usage information, including:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>IP address</li>
              <li>Browser type and version</li>
              <li>Time and date of access</li>
              <li>Error logs (for debugging purposes)</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. How We Use Your Information</h2>
            <p className="mb-4">We use the data we collect strictly to provide and improve the Cleany service:</p>
            <ol className="list-decimal pl-5 space-y-2 mb-4">
              <li><strong>To Function:</strong> The core functionality of Cleany relies on processing your email metadata to execute the cleaning actions you request (e.g., "Delete all emails from newsletter@example.com").</li>
              <li><strong>To Authenticate:</strong> We use your Google credentials to verify your identity and maintain your session.</li>
              <li><strong>To Improve:</strong> We use aggregated, anonymized usage data to fix bugs and optimize app performance.</li>
            </ol>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
              <p className="font-medium text-blue-900">We DO NOT read your emails for the purpose of showing you ads.</p>
              <p className="font-medium text-blue-900">We DO NOT sell, trade, or rent your personal information or email content to third parties.</p>
            </div>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Compliance with Google API Services User Data Policy</h2>
            <p className="mb-4 font-semibold text-red-600">Crucial Disclosure:</p>
            <p className="mb-4">
              Cleany's use and transfer to any other app of information received from Google APIs will adhere to <a href="https://developers.google.com/terms/api-services-user-data-policy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Google API Services User Data Policy</a>, including the <strong>Limited Use</strong> requirements.
            </p>
            <p className="mb-2">This means:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>We only use the data to provide user-facing features (inbox cleaning).</li>
              <li>We do not transfer this data to others unless necessary to provide or improve these features, for legal compliance, or as part of a merger/acquisition.</li>
              <li>We do not use this data for lending usage, serving advertisements, or personalized retargeting.</li>
              <li>Humans do not read your emails unless we have your affirmative agreement for specific messages (e.g., for tech support), it is necessary for security purposes (e.g., investigating abuse), or for compliance with applicable law.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Data Retention</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Email Content:</strong> We process your emails in transit. We do not permanently store the body content of your emails on our servers. Once an operation (like a scan or delete) is complete, the data is discarded from memory.</li>
              <li><strong>Account Data:</strong> We retain your account profile (email address) as long as you remain an active user of our service.</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Data Security</h2>
            <p className="mb-4">We employ industry-standard security measures to protect your information, including:</p>
            <ul className="list-disc pl-5 space-y-1 mb-4">
              <li>Encryption of data in transit (HTTPS/TLS).</li>
              <li>Secure OAuth 2.0 protocols for authentication (we never see or store your Google password).</li>
              <li>Restricted access to our production servers.</li>
            </ul>
            <p>However, no method of transmission over the internet is 100% secure. While we strive to protect your data, we cannot guarantee absolute security.</p>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Your Rights and Control</h2>
            <p className="mb-4">You have full control over your data:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Revoke Access:</strong> You can disconnect Cleany from your Google account at any time by visiting your <a href="https://myaccount.google.com/permissions" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Google Account Security Settings</a>. Once revoked, we lose all access to your Gmail data.</li>
              <li><strong>Request Deletion:</strong> You may contact us to request the deletion of any account usage data we may have stored.</li>
            </ul>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Third-Party Service Providers</h2>
            <p>
              We may use third-party companies (e.g., hosting providers like Vercel, AWS, or Firebase; database providers) to facilitate our Service. These third parties have access to your Personal Information only to perform these tasks on our behalf and are obligated not to disclose or use it for any other purpose.
            </p>
          </section>

          {/* Section 9 */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Changes to This Privacy Policy</h2>
            <p>
              We may update this policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.
            </p>
          </section>

          {/* Section 10 */}
          <section className="border-t pt-6 mt-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Contact Us</h2>
            <p className="mb-2">If you have any questions about this Privacy Policy, please contact us:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>By email:</strong> [Insert Your Support Email]</li>
              <li><strong>By visiting this page on our website:</strong> [Insert Contact URL]</li>
            </ul>
          </section>

        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
