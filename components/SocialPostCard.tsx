import React, { useState, useCallback } from 'react';
import { GeneratedDesign, EditPayload } from '../types';
import { editImage, editText } from '../services/geminiService';
import AdvancedImageEditor from './AdvancedImageEditor';

interface DesignOutputCardProps {
  design: GeneratedDesign;
}

const DesignOutputCard: React.FC<DesignOutputCardProps> = ({ design }) => {
  const [copied, setCopied] = useState(false);
  
  const [currentImage, setCurrentImage] = useState<string | null>(design.image);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isApplyingEdit, setIsApplyingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [currentRationale, setCurrentRationale] = useState<string>(design.rationale);
  const [isEditingText, setIsEditingText] = useState(false);
  const [textEditPrompt, setTextEditPrompt] = useState('');
  const [isApplyingTextEdit, setIsApplyingTextEdit] = useState(false);
  const [textEditError, setTextEditError] = useState<string | null>(null);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(currentRationale).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [currentRationale]);
  
  const handleApplyEdit = async (payload: EditPayload) => {
    if (!currentImage) return;

    setIsApplyingEdit(true);
    setEditError(null);
    try {
        const newImage = await editImage(currentImage, payload);
        setCurrentImage(newImage);
        setIsEditModalOpen(false); // Close modal on success
    } catch(err) {
        const message = err instanceof Error ? err.message : 'Failed to apply image edit.';
        setEditError(message);
        // Do not close modal on error, so user can see the error message
    } finally {
        setIsApplyingEdit(false);
    }
  };

  const handleApplyTextEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textEditPrompt.trim()) return;

    setIsApplyingTextEdit(true);
    setTextEditError(null);
    try {
      const newContent = await editText(currentRationale, textEditPrompt);
      setCurrentRationale(newContent);
      setIsEditingText(false);
      setTextEditPrompt('');
    } catch (err) {
      setTextEditError(err instanceof Error ? err.message : 'Failed to apply text edit.');
    } finally {
      setIsApplyingTextEdit(false);
    }
  };

  const handleSaveImage = () => {
    if (!currentImage) return;
    const link = document.createElement('a');
    link.href = currentImage;
    const fileName = `ai-design-${Date.now()}.png`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderMarkdown = (text: string) => {
    if (!text) return { __html: '' };
    const html = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br />');
    return { __html: html };
  };

  return (
    <>
    <div className="bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 border border-gray-200">
      <div className="p-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Image Column */}
            <div className="w-full">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Generated Design</h3>
                {currentImage ? (
                    <img src={currentImage} alt="Generated Design" className="w-full h-auto object-contain rounded-lg bg-gray-100 p-2 border border-gray-200" />
                ) : (
                    <div className="w-full bg-gray-200 rounded-lg flex items-center justify-center aspect-video">
                        <p className="text-gray-500">Image failed to generate</p>
                    </div>
                )}
                 {currentImage && (
                    <div className="mt-4 space-y-3">
                        <div className="flex items-center gap-4">
                           <button onClick={() => setIsEditModalOpen(true)} className="text-sm text-blue-600 hover:text-blue-500 font-semibold" disabled={isApplyingEdit}>
                               ✏️ Edit Image with AI
                           </button>
                           <button onClick={handleSaveImage} className="text-sm text-sky-600 hover:text-sky-500 font-semibold">
                               💾 Save Image
                           </button>
                        </div>
                    </div>
                )}
            </div>
            {/* Rationale Column */}
            <div className="bg-gray-50 p-4 rounded-lg h-full flex flex-col border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-2xl font-bold text-gray-900">Design Rationale</h3>
                    <button
                        onClick={handleCopy}
                        className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors text-gray-800 ${ copied ? 'bg-green-500 text-white' : `bg-gray-200 hover:bg-gray-300` }`}
                    >
                        {copied ? 'Copied!' : 'Copy Text'}
                    </button>
                </div>
                <div
                  className="flex-grow text-gray-700 font-sans leading-relaxed mb-4 prose prose-sm"
                  dangerouslySetInnerHTML={renderMarkdown(currentRationale)}
                />
                <div className="mt-auto">
                    <button 
                        onClick={() => setIsEditingText(!isEditingText)} 
                        className="text-sm text-blue-600 hover:text-blue-500 font-semibold" 
                        disabled={isApplyingTextEdit}
                    >
                       {isEditingText ? 'Cancel' : '✏️ Edit Rationale with AI'}
                    </button>
                    {isEditingText && (
                        <form onSubmit={handleApplyTextEdit} className="mt-2 space-y-2">
                            <input 
                                type="text"
                                value={textEditPrompt}
                                onChange={(e) => setTextEditPrompt(e.target.value)}
                                placeholder="e.g., make this sound more luxurious"
                                className="w-full p-2 bg-white border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500"
                            />
                            <button 
                                type="submit" 
                                className="w-full px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50" 
                                disabled={isApplyingTextEdit || !textEditPrompt.trim()}
                            >
                                {isApplyingTextEdit ? 'Applying...' : 'Apply Edit'}
                            </button>
                            {textEditError && <p className="text-xs text-red-500">{textEditError}</p>}
                        </form>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
    {currentImage && (
      <AdvancedImageEditor
        isOpen={isEditModalOpen}
        onClose={() => {
            setIsEditModalOpen(false);
            setEditError(null);
        }}
        onSubmit={handleApplyEdit}
        imageUrl={currentImage}
        isApplyingEdit={isApplyingEdit}
        error={editError}
      />
    )}
    </>
  );
};

export default DesignOutputCard;