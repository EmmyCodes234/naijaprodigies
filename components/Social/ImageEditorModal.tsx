import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Icon } from '@iconify/react';
import { getCroppedImg } from '../../utils/imageUtils';

interface ImageEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    imageSrc: string;
    onSave: (croppedImage: Blob, altText: string) => void;
    initialAltText?: string;
}

const ImageEditorModal: React.FC<ImageEditorModalProps> = ({
    isOpen,
    onClose,
    imageSrc,
    onSave,
    initialAltText = ''
}) => {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'crop' | 'alt'>('crop');
    const [altText, setAltText] = useState(initialAltText);
    const [isSaving, setIsSaving] = useState(false);

    const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
            if (croppedImage) {
                onSave(croppedImage, altText);
                onClose();
            }
        } catch (e) {
            console.error(e);
            alert('Failed to crop image');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center animate-fade-in">
            {/* Header */}
            <div className="w-full max-w-2xl px-4 py-3 flex justify-between items-center text-white">
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <Icon icon="ph:arrow-left" width="24" height="24" />
                </button>
                <span className="font-bold text-lg">Edit media</span>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-white text-black px-4 py-1.5 rounded-full font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                    {isSaving ? 'Saving...' : 'Save'}
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 w-full max-w-2xl relative bg-black overflow-hidden flex flex-col">
                {/* Editor Area */}
                <div className="flex-1 relative w-full h-[60vh] md:h-[500px] bg-[#151515]">
                    {activeTab === 'crop' ? (
                        <div className="relative w-full h-full">
                            <Cropper
                                image={imageSrc}
                                crop={crop}
                                zoom={zoom}
                                aspect={undefined} // Flexible aspect ratio
                                onCropChange={setCrop}
                                onCropComplete={onCropComplete}
                                onZoomChange={setZoom}
                                showGrid={true}
                            />
                        </div>
                    ) : (
                        <div className="p-6 h-full flex flex-col">
                            <h3 className="text-white font-bold text-xl mb-2">Description</h3>
                            <p className="text-gray-400 text-sm mb-4">
                                People who are blind or low vision can't see images. Describe what's in the photo so they can appreciate it too.
                            </p>
                            <textarea
                                value={altText}
                                onChange={(e) => setAltText(e.target.value)}
                                placeholder="What's in this image?"
                                className="w-full flex-1 bg-gray-900 border border-gray-700 rounded-xl p-4 text-white resize-none focus:outline-none focus:border-nsp-teal"
                                maxLength={1000}
                            />
                            <div className="text-right text-gray-500 text-xs mt-2">
                                {altText.length}/1000
                            </div>
                        </div>
                    )}
                </div>

                {/* Tab Controls (Bottom) */}
                <div className="bg-black border-t border-gray-800 p-4">
                    {/* Zoom Slider (Crop Only) */}
                    {activeTab === 'crop' && (
                        <div className="mb-6 flex items-center justify-center gap-4 max-w-md mx-auto">
                            <Icon icon="ph:minus" className="text-gray-400" />
                            <input
                                type="range"
                                value={zoom}
                                min={1}
                                max={3}
                                step={0.1}
                                aria-labelledby="Zoom"
                                onChange={(e) => setZoom(Number(e.target.value))}
                                className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-nsp-teal"
                            />
                            <Icon icon="ph:plus" className="text-gray-400" />
                        </div>
                    )}

                    {/* Tab Switcher */}
                    <div className="flex justify-center gap-8">
                        <button
                            onClick={() => setActiveTab('crop')}
                            className={`flex flex-col items-center gap-1 ${activeTab === 'crop' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            <div className={`p-2 rounded-full ${activeTab === 'crop' ? 'bg-white text-black' : 'border border-gray-600'}`}>
                                <Icon icon="ph:crop-bold" width="20" height="20" />
                            </div>
                            <span className="text-xs font-medium">Crop</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('alt')}
                            className={`flex flex-col items-center gap-1 ${activeTab === 'alt' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            <div className={`p-2 rounded-full ${activeTab === 'alt' ? 'bg-white text-black' : 'border border-gray-600'}`}>
                                <Icon icon="ph:text-aa-bold" width="20" height="20" />
                            </div>
                            <span className="text-xs font-medium">ALT</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImageEditorModal;
