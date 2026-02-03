import React, { useRef } from 'react';
import GlassCard from './GlassCard';

const UploadButton = ({ onUpload, uploading, customLabel = "Upload Receipt" }) => {
    const fileInputRef = useRef(null);

    const handleClick = () => {
        fileInputRef.current.click();
    };

    const handleChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            onUpload(e.target.files[0]);
        }
    };

    return (
        <div className="w-full">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleChange}
                accept="image/*"
                className="hidden"
            />
            <button
                onClick={handleClick}
                disabled={uploading}
                className="w-full h-32 bg-white/40 border border-white/50 shadow-inner rounded-3xl flex flex-col items-center justify-center text-indigo-600 font-bold hover:bg-white/60 transition-colors backdrop-blur-sm"
            >
                {uploading ? (
                    <div className="flex flex-col items-center animate-pulse">
                        <div className="p-3 bg-indigo-50/50 rounded-full mb-2 shadow-sm">
                            <svg className="animate-spin h-6 w-6 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        </div>
                        <span>Processing...</span>
                    </div>
                ) : (
                    <>
                        <div className="p-3 bg-indigo-50/50 rounded-full mb-2 shadow-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                        </div>
                        {customLabel}
                    </>
                )}
            </button>
        </div>
    );
};

export default UploadButton;
