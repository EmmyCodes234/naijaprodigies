import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { useToast } from '../../contexts/ToastContext';

interface ExploreSettingsProps {
    isOpen: boolean;
    onClose: () => void;
}

const ExploreSettings: React.FC<ExploreSettingsProps> = ({ isOpen, onClose }) => {
    const { addToast } = useToast();
    const [settings, setSettings] = useState({
        showContentInLocation: true,
        trendsForYou: true,
    });

    if (!isOpen) return null;

    const toggleSetting = (key: keyof typeof settings) => {
        setSettings(prev => {
            const newSettings = { ...prev, [key]: !prev[key] };
            // Simulate saving
            if (newSettings[key] !== prev[key]) {
                addToast('success', 'Settings updated');
            }
            return newSettings;
        });
    };

    return (
        <>
            <div
                className="fixed inset-0 bg-black/40 z-50 transition-opacity"
                onClick={onClose}
            />
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
                <div className="bg-white rounded-2xl w-full max-w-[600px] shadow-xl pointer-events-auto h-[600px] max-h-[90vh] flex flex-col">
                    {/* Header */}
                    <div className="flex items-center px-4 h-[53px]">
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors -ml-2"
                        >
                            <Icon icon="ph:x" width="20" height="20" className="text-gray-900" />
                        </button>
                        <h2 className="font-bold text-xl text-gray-900 ml-6">Explore settings</h2>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto px-4">
                        {/* Location Section */}
                        <div className="py-3">
                            <h3 className="font-bold text-[20px] text-gray-900 mb-1">Location</h3>
                            <div className="flex items-center justify-between py-3">
                                <div className="pr-4">
                                    <h4 className="font-medium text-[15px] text-gray-900 leading-5">Show content in this location</h4>
                                    <p className="text-[13px] text-gray-500 mt-1 leading-4">When this is on, you'll see what's happening around you right now.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={settings.showContentInLocation}
                                        onChange={() => toggleSetting('showContentInLocation')}
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-nsp-teal"></div>
                                </label>
                            </div>
                        </div>

                        {/* Personalization Section */}
                        <div className="py-3">
                            <h3 className="font-bold text-[20px] text-gray-900 mb-1">Personalization</h3>
                            <div className="flex items-center justify-between py-3">
                                <div className="pr-4">
                                    <h4 className="font-medium text-[15px] text-gray-900 leading-5">Trends for you</h4>
                                    <p className="text-[13px] text-gray-500 mt-1 leading-4">You can personalize trends based on your location and who you follow.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={settings.trendsForYou}
                                        onChange={() => toggleSetting('trendsForYou')}
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-nsp-teal"></div>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ExploreSettings;
