import React from 'react';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';

const PrivacyPolicy: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
                <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        <Icon icon="ph:arrow-left-bold" width="20" height="20" />
                        <span className="font-medium">Back</span>
                    </button>
                    <div className="font-bold text-lg text-gray-900">NSP Legal</div>
                    <div className="w-[70px]"></div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-3xl mx-auto px-6 py-12 md:py-16">
                <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">Privacy Policy</h1>
                <p className="text-gray-500 mb-10">Last updated: January 4, 2026</p>

                <div className="space-y-10 text-gray-800 leading-relaxed">
                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-4">1. Introduction</h2>
                        <p className="mb-4">
                            Nigeria Scrabble Prodigies ("NSP", "we", "us", or "our") respects your privacy and is committed to protecting your personal data. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our social platform services.
                        </p>
                        <p>
                            Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the site.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-4">2. Information We Collect</h2>
                        <p className="mb-4">We collect information about you in a range of forms, including personal data. As used in this Policy, "Personal Data" is as defined in the General Data Protection Regulation and the Nigeria Data Protection Regulation (NDPR), this includes any information which, either alone or in combination with other information we hold about you, identifies you as an individual.</p>

                        <h3 className="text-lg font-bold text-gray-900 mt-6 mb-2">Personal Data</h3>
                        <p className="mb-2">We collect Personal Data that you voluntarily provide to us when you register on the Service, expressed an interest in obtaining information about us or our products and services, when you participate in activities on the Service, or otherwise when you contact us.</p>
                        <ul className="list-disc pl-5 space-y-2 mb-4">
                            <li><strong>Identity Data:</strong> Name, username, date of birth.</li>
                            <li><strong>Contact Data:</strong> Email address, telephone number.</li>
                            <li><strong>Profile Data:</strong> Your profile picture, biography, location, and other profile information you choose to provide.</li>
                            <li><strong>Content Data:</strong> Any content you post to the Service (text, images, messages).</li>
                        </ul>

                        <h3 className="text-lg font-bold text-gray-900 mt-6 mb-2">Usage Data</h3>
                        <p>We may also collect information that your browser sends automatically when you visit our Service ("Usage Data"). This Usage Data may include information such as your computer's Internet Protocol address (e.g., IP address), browser type, browser version, the pages of our Service that you visit, the time and date of your visit, and other diagnostic data.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-4">3. How We Use Your Information</h2>
                        <p className="mb-4">We use the information we collect or receive:</p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>To facilitate account creation and logon process.</li>
                            <li>To send you administrative information, such as product, service and new feature information and/or information about changes to our terms, conditions, and policies.</li>
                            <li>To protect our Services (e.g., fraud monitoring and prevention).</li>
                            <li>To enable user-to-user communications.</li>
                            <li>To improve your experience and customize the content you see.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-4">4. Sharing Your Information</h2>
                        <p className="mb-4">We may share information we have collected about you in certain situations. Your information may be disclosed as follows:</p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>By Law or to Protect Rights:</strong> If we believe the release of information about you is necessary to respond to legal process, to investigate or remedy potential violations of our policies, or to protect the rights, property, and safety of others.</li>
                            <li><strong>With Service Providers:</strong> We may share your information with third-party vendors, service providers, contractors, or agents who perform services for us or on our behalf and require access to such information to do that work.</li>
                            <li><strong>Other Users:</strong> When you share personal information or otherwise interact with public areas of the Site, such personal information may be viewed by all users and may be publicly distributed outside the Site in perpetuity.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-4">5. Security of Your Data</h2>
                        <p>
                            We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-4">6. Your Data Rights</h2>
                        <p className="mb-4">Depending on your location, you may have the following rights regarding your Personal Data:</p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>The right to access – You have the right to request copies of your personal data.</li>
                            <li>The right to rectification – You have the right to request that we correct any information you believe is inaccurate.</li>
                            <li>The right to erasure – You have the right to request that we erase your personal data, under certain conditions.</li>
                            <li>The right to restrict processing – You have the right to request that we restrict the processing of your personal data.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-4">7. Contact Us</h2>
                        <p>
                            If you have questions or comments about this policy, you may email us at <a href="mailto:privacy@nsp.com" className="text-nsp-teal hover:underline font-medium">privacy@nsp.com</a>.
                        </p>
                    </section>
                </div>

                <div className="mt-16 pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500 gap-4">
                    <p>© 2026 Nigeria Scrabble Prodigies. All rights reserved.</p>
                    <div className="flex gap-6">
                        <a href="#/terms" className="hover:text-gray-900 transition-colors">Terms of Service</a>
                        <a href="#/cookie-policy" className="hover:text-gray-900 transition-colors">Cookie Policy</a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
