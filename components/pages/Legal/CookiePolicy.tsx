import React from 'react';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';

const CookiePolicy: React.FC = () => {
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
                <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">Cookie Policy</h1>
                <p className="text-gray-500 mb-10">Last updated: January 4, 2026</p>

                <div className="space-y-10 text-gray-800 leading-relaxed">
                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-4">1. What are Cookies?</h2>
                        <p className="mb-4">
                            Cookies are small text files that are stored on your computer or mobile device when you visit a website. They allow the website to recognize your device and remember if you have been to the website before. Cookies are widely used in order to make websites work, or work more efficiently, as well as to provide information to the owners of the site.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-4">2. Why We Use Cookies</h2>
                        <p className="mb-4">
                            We use cookies to improve your experience on our site, including:
                        </p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>Keeping you signed in.</li>
                            <li>Understanding how you use our site.</li>
                            <li>Showing you content that is relevant to you.</li>
                            <li>Working with our partners to see where we have a relationship.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-4">3. Types of Cookies We Use</h2>

                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">Essential Cookies</h3>
                                <p>These cookies are necessary for the website to function and cannot be switched off in our systems. They are usually only set in response to actions made by you which amount to a request for services, such as setting your privacy preferences, logging in, or filling in forms.</p>
                            </div>

                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">Performance & Analytics Cookies</h3>
                                <p>These cookies allow us to count visits and traffic sources so we can measure and improve the performance of our site. They help us to know which pages are the most and least popular and see how visitors move around the site.</p>
                            </div>

                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">Functional Cookies</h3>
                                <p>These cookies enable the website to provide enhanced functionality and personalization. They may be set by us or by third-party providers whose services we have added to our pages.</p>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-4">4. Managing Cookies</h2>
                        <p className="mb-4">
                            Most web browsers allow some control of most cookies through the browser settings. To find out more about cookies, including how to see what cookies have been set, visit <a href="https://www.aboutcookies.org" target="_blank" rel="noopener noreferrer" className="text-nsp-teal hover:underline">www.aboutcookies.org</a> or <a href="https://www.allaboutcookies.org" target="_blank" rel="noopener noreferrer" className="text-nsp-teal hover:underline">www.allaboutcookies.org</a>.
                        </p>
                        <p>
                            Find out how to manage cookies on popular browsers:
                        </p>
                        <ul className="list-disc pl-5 space-y-1.5 mt-2">
                            <li><a href="https://support.google.com/accounts/answer/61416" target="_blank" rel="noopener noreferrer" className="text-nsp-teal hover:underline">Google Chrome</a></li>
                            <li><a href="https://support.microsoft.com/en-us/help/17442/windows-internet-explorer-delete-manage-cookies" target="_blank" rel="noopener noreferrer" className="text-nsp-teal hover:underline">Microsoft Edge</a></li>
                            <li><a href="https://support.mozilla.org/en-US/kb/enable-and-disable-cookies-website-preferences" target="_blank" rel="noopener noreferrer" className="text-nsp-teal hover:underline">Mozilla Firefox</a></li>
                            <li><a href="https://support.apple.com/en-gb/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-nsp-teal hover:underline">Apple Safari</a></li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 mb-4">5. Updates to This Policy</h2>
                        <p>
                            We may update this Cookie Policy from time to time. The updated version will be indicated by an updated "Revised" date and the updated version will be effective as soon as it is accessible.
                        </p>
                    </section>
                </div>

                <div className="mt-16 pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500 gap-4">
                    <p>© 2026 Nigeria Scrabble Prodigies. All rights reserved.</p>
                    <div className="flex gap-6">
                        <a href="#/terms" className="hover:text-gray-900 transition-colors">Terms of Service</a>
                        <a href="#/privacy" className="hover:text-gray-900 transition-colors">Privacy Policy</a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CookiePolicy;
