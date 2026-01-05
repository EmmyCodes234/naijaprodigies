import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { User } from '../../types';
import { supabase } from '../../services/supabaseClient';
import { useToast } from '../../contexts/ToastContext';

interface MessageSettingsProps {
    currentUser: User;
    onClose: () => void;
    onChangePasscode: () => void;
}

type MessageRequestSetting = 'no_one' | 'verified' | 'everyone';

interface MessageSettingsState {
    message_request_setting: MessageRequestSetting;
    allow_subscriber_messages: boolean;
    filter_low_quality_messages: boolean;
    enable_debug_logs: boolean;
}

const MessageSettings: React.FC<MessageSettingsProps> = ({ currentUser, onClose, onChangePasscode }) => {
    const { addToast } = useToast();
    const [settings, setSettings] = useState<MessageSettingsState>({
        message_request_setting: 'everyone',
        allow_subscriber_messages: true,
        filter_low_quality_messages: true,
        enable_debug_logs: false
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Load settings on mount
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const { data, error } = await supabase
                    .from('users')
                    .select('message_request_setting, allow_subscriber_messages, filter_low_quality_messages, enable_debug_logs')
                    .eq('id', currentUser.id)
                    .single();

                if (error) throw error;

                if (data) {
                    setSettings({
                        message_request_setting: data.message_request_setting || 'everyone',
                        allow_subscriber_messages: data.allow_subscriber_messages ?? true,
                        filter_low_quality_messages: data.filter_low_quality_messages ?? true,
                        enable_debug_logs: data.enable_debug_logs ?? false
                    });
                }
            } catch (error) {
                console.error('Failed to load message settings:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadSettings();
    }, [currentUser.id]);

    // Save settings
    const saveSetting = async (key: keyof MessageSettingsState, value: any) => {
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('users')
                .update({ [key]: value })
                .eq('id', currentUser.id);

            if (error) throw error;

            setSettings(prev => ({ ...prev, [key]: value }));
        } catch (error) {
            console.error('Failed to save setting:', error);
            addToast('error', 'Failed to save setting');
        } finally {
            setIsSaving(false);
        }
    };

    const handleRequestSettingChange = (value: MessageRequestSetting) => {
        saveSetting('message_request_setting', value);
    };

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-100">
                <button
                    onClick={onClose}
                    className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                    <Icon icon="ph:arrow-left" width="20" height="20" />
                </button>
                <h1 className="text-xl font-bold text-gray-900">Settings</h1>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Icon icon="line-md:loading-twotone-loop" width="32" height="32" className="text-nsp-teal" />
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {/* Allow message requests from */}
                        <div className="px-4 py-4">
                            <h2 className="text-[15px] font-bold text-gray-900 mb-1">
                                Allow message requests from:
                            </h2>
                            <p className="text-[13px] text-gray-500 mb-4">
                                People you follow will always be able to message you.{' '}
                                <a href="#" className="text-nsp-teal hover:underline">Learn more</a>
                            </p>

                            <div className="space-y-3">
                                <label className="flex items-center justify-between cursor-pointer">
                                    <span className="text-[15px] text-gray-900">No one</span>
                                    <input
                                        type="radio"
                                        name="messageRequest"
                                        checked={settings.message_request_setting === 'no_one'}
                                        onChange={() => handleRequestSettingChange('no_one')}
                                        className="w-5 h-5 text-nsp-teal border-gray-300 focus:ring-nsp-teal"
                                    />
                                </label>
                                <label className="flex items-center justify-between cursor-pointer">
                                    <span className="text-[15px] text-gray-900">Verified users</span>
                                    <input
                                        type="radio"
                                        name="messageRequest"
                                        checked={settings.message_request_setting === 'verified'}
                                        onChange={() => handleRequestSettingChange('verified')}
                                        className="w-5 h-5 text-nsp-teal border-gray-300 focus:ring-nsp-teal"
                                    />
                                </label>
                                <label className="flex items-center justify-between cursor-pointer">
                                    <span className="text-[15px] text-gray-900">Everyone</span>
                                    <input
                                        type="radio"
                                        name="messageRequest"
                                        checked={settings.message_request_setting === 'everyone'}
                                        onChange={() => handleRequestSettingChange('everyone')}
                                        className="w-5 h-5 text-nsp-teal border-gray-300 focus:ring-nsp-teal"
                                    />
                                </label>
                            </div>
                        </div>

                        {/* Allow messages from subscribers */}
                        <div className="px-4 py-4">
                            <label className="flex items-start justify-between cursor-pointer">
                                <div className="flex-1 pr-4">
                                    <h2 className="text-[15px] font-bold text-gray-900 mb-1">
                                        Allow messages from my subscribers
                                    </h2>
                                    <p className="text-[13px] text-gray-500">
                                        Your subscribers will always be able to send you messages independent of other messaging settings.{' '}
                                        <a href="#" className="text-nsp-teal hover:underline">Learn more</a>
                                    </p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={settings.allow_subscriber_messages}
                                    onChange={(e) => saveSetting('allow_subscriber_messages', e.target.checked)}
                                    className="mt-1 w-5 h-5 text-nsp-teal border-gray-300 rounded focus:ring-nsp-teal"
                                />
                            </label>
                        </div>

                        {/* Filter low-quality messages */}
                        <div className="px-4 py-4">
                            <label className="flex items-start justify-between cursor-pointer">
                                <div className="flex-1 pr-4">
                                    <h2 className="text-[15px] font-bold text-gray-900 mb-1">
                                        Filter low-quality messages
                                    </h2>
                                    <p className="text-[13px] text-gray-500">
                                        Hide message requests that have been detected as being potentially spam or low-quality. These will be sent to a separate inbox at the bottom of your message requests.{' '}
                                        <a href="#" className="text-nsp-teal hover:underline">Learn more</a>
                                    </p>
                                </div>
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        checked={settings.filter_low_quality_messages}
                                        onChange={(e) => saveSetting('filter_low_quality_messages', e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div
                                        onClick={() => saveSetting('filter_low_quality_messages', !settings.filter_low_quality_messages)}
                                        className={`w-11 h-6 rounded-full cursor-pointer transition-colors ${settings.filter_low_quality_messages ? 'bg-nsp-teal' : 'bg-gray-200'
                                            }`}
                                    >
                                        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.filter_low_quality_messages ? 'translate-x-[22px]' : 'translate-x-0.5'
                                            }`} />
                                    </div>
                                </div>
                            </label>
                        </div>

                        {/* Encrypted messages section */}
                        <div className="px-4 py-4">
                            <h2 className="text-[15px] font-bold text-gray-900 mb-3">
                                Encrypted messages
                            </h2>
                            <button
                                onClick={onChangePasscode}
                                className="w-full flex items-center justify-between py-2 text-left hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
                            >
                                <span className="text-[15px] text-gray-900">Change passcode</span>
                                <Icon icon="ph:caret-right" width="20" height="20" className="text-gray-400" />
                            </button>
                        </div>

                        {/* Troubleshooting section */}
                        <div className="px-4 py-4">
                            <h2 className="text-[15px] font-bold text-gray-900 mb-3">
                                Troubleshooting
                            </h2>
                            <label className="flex items-start justify-between cursor-pointer">
                                <div className="flex-1 pr-4">
                                    <h3 className="text-[15px] text-gray-900 mb-1">
                                        Enable Debug Logs
                                    </h3>
                                    <p className="text-[13px] text-gray-500">
                                        Enabling this will write chat logs to your device. Message contents are not included but additional metadata about the messages is.
                                    </p>
                                </div>
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        checked={settings.enable_debug_logs}
                                        onChange={(e) => saveSetting('enable_debug_logs', e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div
                                        onClick={() => saveSetting('enable_debug_logs', !settings.enable_debug_logs)}
                                        className={`w-11 h-6 rounded-full cursor-pointer transition-colors ${settings.enable_debug_logs ? 'bg-nsp-teal' : 'bg-gray-200'
                                            }`}
                                    >
                                        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.enable_debug_logs ? 'translate-x-[22px]' : 'translate-x-0.5'
                                            }`} />
                                    </div>
                                </div>
                            </label>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MessageSettings;
