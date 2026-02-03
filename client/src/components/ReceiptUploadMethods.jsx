import React, { useRef, useState } from 'react';

const ReceiptUploadMethods = ({ onCameraCapture, onUploadWithOption, uploading }) => {
    const cameraInputRef = useRef(null);
    const galleryInputRef = useRef(null);
    const [showAutoFillOption, setShowAutoFillOption] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [autoFill, setAutoFill] = useState(true);

    const handleCameraClick = () => {
        cameraInputRef.current.click();
    };

    const handleCameraCapture = (e) => {
        if (e.target.files && e.target.files[0]) {
            onCameraCapture(e.target.files[0]);
        }
    };

    const handleGalleryClick = () => {
        galleryInputRef.current.click();
    };

    const handleGallerySelect = (e) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
            setShowAutoFillOption(true);
        }
    };

    const handleConfirmUpload = () => {
        if (selectedFile) {
            onUploadWithOption(selectedFile, autoFill);
            setShowAutoFillOption(false);
            setSelectedFile(null);
            setAutoFill(true);
        }
    };

    const handleCancelUpload = () => {
        setShowAutoFillOption(false);
        setSelectedFile(null);
        setAutoFill(true);
    };

    if (showAutoFillOption) {
        return (
            <div className="space-y-4 animate-fade-in">
                {/* Preview of selected image */}
                <div className="relative h-48 bg-slate-100 rounded-2xl overflow-hidden border-2 border-indigo-200">
                    <img
                        src={URL.createObjectURL(selectedFile)}
                        alt="Preview"
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-3 py-1 rounded-full backdrop-blur-sm">
                        Preview
                    </div>
                </div>

                {/* Auto-fill checkbox */}
                <div className="bg-white/60 backdrop-blur-md rounded-xl p-4 border border-white/70 shadow-sm">
                    <label className="flex items-center space-x-3 cursor-pointer group">
                        <div className="relative">
                            <input
                                type="checkbox"
                                checked={autoFill}
                                onChange={(e) => setAutoFill(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-6 h-6 bg-white border-2 border-slate-300 rounded-md peer-checked:bg-indigo-500 peer-checked:border-indigo-500 transition-all flex items-center justify-center">
                                {autoFill && (
                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                            </div>
                        </div>
                        <div className="flex-1">
                            <p className="font-bold text-slate-700 text-sm">Auto-fill amount and date</p>
                            <p className="text-xs text-slate-500">Use OCR to extract details automatically</p>
                        </div>
                    </label>
                </div>

                {/* Action buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={handleCancelUpload}
                        className="flex-1 py-3 bg-white/70 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirmUpload}
                        disabled={uploading}
                        className="flex-1 py-3 bg-indigo-500 rounded-xl font-semibold text-white hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/30"
                    >
                        {uploading ? 'Processing...' : autoFill ? 'Scan & Continue' : 'Continue'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Camera input (hidden) */}
            <input
                type="file"
                ref={cameraInputRef}
                onChange={handleCameraCapture}
                accept="image/*"
                capture="environment"
                className="hidden"
            />

            {/* Gallery input (hidden) */}
            <input
                type="file"
                ref={galleryInputRef}
                onChange={handleGallerySelect}
                accept="image/*"
                className="hidden"
            />

            {/* Method 1: Camera Scan */}
            <button
                onClick={handleCameraClick}
                disabled={uploading}
                className="group relative w-full h-24 bg-white/40 border border-white/50 backdrop-blur-md rounded-2xl flex items-center px-6 transition-all hover:bg-white/60 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
                <div className="mr-4 p-3 bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition-transform">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                    </svg>
                </div>
                <div className="text-left flex-1">
                    <p className="font-bold text-slate-700 text-sm">Scan with Camera</p>
                    <p className="text-[10px] text-slate-500 font-semibold">Use Camera</p>
                </div>
            </button>

            {/* Method 2: Upload from Gallery */}
            <button
                onClick={handleGalleryClick}
                disabled={uploading}
                className="group relative w-full h-24 bg-white/40 border border-white/50 backdrop-blur-md rounded-2xl flex items-center px-6 transition-all hover:bg-white/60 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
                <div className="mr-4 p-3 bg-white text-indigo-500 rounded-xl shadow-md border border-indigo-100 group-hover:scale-110 transition-transform">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                    </svg>
                </div>
                <div className="text-left flex-1">
                    <p className="font-bold text-slate-700 text-sm">Upload Image</p>
                    <p className="text-[10px] text-slate-500 font-semibold">From Gallery</p>
                </div>
            </button>
        </div>
    );
};

export default ReceiptUploadMethods;
