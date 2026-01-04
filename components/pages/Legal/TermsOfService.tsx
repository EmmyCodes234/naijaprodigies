import React from 'react';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';

const TermsOfService: React.FC = () => {
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
                    <div className="w-[70px]"></div> {/* Spacer for alignment */}
                </div>
            </div>

            {/* Content */}
            <div className="max-w-3xl mx-auto px-6 py-12 md:py-16">
                <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">Terms of Service</h1>
                <p className="text-gray-500 mb-10">Last updated: January 4, 2026</p>

                <div className="space-y-10 text-gray-800 leading-relaxed">
                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-4">1. Acceptance of Terms</h2>
                        <p className="mb-4">
                            By accessing or using the Nigeria Scrabble Prodigies (NSP) platform, website, and related services (collectively, the "Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you must not access or use the Service.
                        </p>
                        <p>
                            We reserve the right to modify these Terms at any time. We will provide notice of significant changes by updating the date at the top of these Terms and by maintaining a current version on our website. Your continued use of the Service after any modification constitutes your acceptance of the new Terms.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-4">2. User Accounts and Security</h2>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>Eligibility:</strong> You must be at least 13 years old to use the Service. By agreeing to these Terms, you represent and warrant that you have the legal capacity to accept these Terms.</li>
                            <li><strong>Account Security:</strong> You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to immediately notify us of any unauthorized use of your account.</li>
                            <li><strong>Accuracy:</strong> You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate, current, and complete.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-4">3. User Conduct and Content</h2>
                        <p className="mb-4">
                            You act as the sole owner of the content you post. However, by posting content to NSP, you grant us a non-exclusive, worldwide, royalty-free license to use, reproduce, modify, and display your content in connection with providing the Service.
                        </p>
                        <p className="mb-4 font-semibold">You agree NOT to:</p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>Post content that is illegal, harmful, threatening, abusive, harassing, defamatory, or hateful.</li>
                            <li>Impersonate any person or entity or falsely state your affiliation with a person or entity.</li>
                            <li>Engage in any automated use of the system, such as using scripts to add friends or send comments (spam).</li>
                            <li>Attempt to interfere with, compromise the system integrity or security, or decipher any transmissions to or from the servers running the Service.</li>
                            <li>Sell, rent, lease, or sublicense the Service or access to it.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-4">4. Intellectual Property Rights</h2>
                        <p className="mb-4">
                            The Service and its original content (excluding content provided by users), features, and functionality are and will remain the exclusive property of Nigeria Scrabble Prodigies and its licensors. The Service is protected by copyright, trademark, and other laws of Nigeria and foreign countries.
                        </p>
                        <p>
                            Our trademarks and trade dress may not be used in connection with any product or service without the prior written consent of NSP.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-4">5. Termination</h2>
                        <p>
                            We may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever and without limitation, including but not limited to a breach of the Terms.
                        </p>
                        <p className="mt-4">
                            If you wish to terminate your account, you may simply discontinue using the Service or delete your account via the Settings page.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-4">6. Limitation of Liability</h2>
                        <p>
                            In no event shall NSP, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from (i) your access to or use of or inability to access or use the Service; (ii) any conduct or content of any third party on the Service; (iii) any content obtained from the Service; and (iv) unauthorized access, use, or alteration of your transmissions or content.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-4">7. Governing Law</h2>
                        <p>
                            These Terms shall be governed and construed in accordance with the laws of the Federal Republic of Nigeria, without regard to its conflict of law provisions. Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-4">8. Contact Us</h2>
                        <p>
                            If you have any questions about these Terms, please contact us at: <a href="mailto:legal@nsp.com" className="text-nsp-teal hover:underline font-medium">legal@nsp.com</a>
                        </p>
                    </section>
                </div>

                <div className="mt-16 pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500 gap-4">
                    <p>© 2026 Nigeria Scrabble Prodigies. All rights reserved.</p>
                    <div className="flex gap-6">
                        <a href="#/privacy" className="hover:text-gray-900 transition-colors">Privacy Policy</a>
                        <a href="#/cookie-policy" className="hover:text-gray-900 transition-colors">Cookie Policy</a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TermsOfService;
