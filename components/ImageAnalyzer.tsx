import React, { useState, useCallback, useEffect } from 'react';

interface ReferenceImageUploaderProps {
  onFilesChange: (files: File[]) => void;
  disabled?: boolean;
}

const ReferenceImageUploader: React.FC<ReferenceImageUploaderProps> = ({ onFilesChange, disabled }) => {
    const [files, setFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    
    useEffect(() => {
        onFilesChange(files);
    }, [files, onFilesChange]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(e.target.files || []);
        if (selectedFiles.length > 0) {
            setFiles(selectedFiles);
            
            const newPreviews: string[] = [];
            selectedFiles.forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    newPreviews.push(reader.result as string);
                    if (newPreviews.length === selectedFiles.length) {
                        setPreviews(newPreviews);
                    }
                };
                reader.readAsDataURL(file);
            });
        }
    };
    
    const handleRemoveFile = (index: number) => {
        const newFiles = [...files];
        const newPreviews = [...previews];
        newFiles.splice(index, 1);
        newPreviews.splice(index, 1);
        setFiles(newFiles);
        setPreviews(newPreviews);
    };

    return (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            {previews.length === 0 ? (
                <div className="w-full h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center">
                    <label htmlFor="file-upload" className={`cursor-pointer text-blue-600 font-semibold ${disabled ? 'text-gray-500 cursor-not-allowed' : 'hover:text-blue-500'}`}>
                        Choose images to influence style
                    </label>
                    <input id="file-upload" type="file" multiple className="hidden" accept="image/*" onChange={handleFileChange} disabled={disabled} />
                    <p className="text-xs text-gray-500 mt-1">Upload inspiration photos (PNG, JPG, etc.)</p>
                </div>
            ) : (
                <div>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-3">
                        {previews.map((preview, index) => (
                            <div key={index} className="relative group">
                                <img src={preview} alt={`Preview ${index + 1}`} className="rounded-md w-full aspect-square object-cover" />
                                <button
                                    onClick={() => handleRemoveFile(index)}
                                    className="absolute top-0 right-0 m-1 bg-red-600/80 hover:bg-red-500 rounded-full w-5 h-5 flex items-center justify-center text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                    aria-label={`Remove image ${index + 1}`}
                                    disabled={disabled}
                                >
                                    &times;
                                </button>
                            </div>
                        ))}
                    </div>
                     <label htmlFor="file-upload-replace" className={`cursor-pointer text-sm font-semibold ${disabled ? 'text-gray-500 cursor-not-allowed' : 'text-blue-600 hover:text-blue-500'}`}>
                        Change images
                    </label>
                    <input id="file-upload-replace" type="file" multiple className="hidden" accept="image/*" onChange={handleFileChange} disabled={disabled} />
                </div>
            )}
        </div>
    );
};

export default ReferenceImageUploader;