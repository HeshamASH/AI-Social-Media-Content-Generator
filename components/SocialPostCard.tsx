import React, { useState, useCallback, useEffect } from 'react';
import { GeneratedDesign, EditPayload } from '../types';
import { editImage, editText } from '../services/geminiService';
import AdvancedImageEditor from './AdvancedImageEditor';
import { ShareIcon } from './IconComponents';

interface DesignOutputCardProps {
  design: GeneratedDesign;
  onSave: () => void;
  onUpdate: (updatedDesign: GeneratedDesign) => void;
  onImageClick: (imageUrl: string) => void;
}

const DesignOutputCard: React.FC<DesignOutputCardProps> = ({ design, onSave, onUpdate, onImageClick }) => {
  const [copied, setCopied] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [isShareSupported, setIsShareSupported] = useState(false);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isApplyingEdit, setIsApplyingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [isEditingText, setIsEditingText] = useState(false);
  const [textEditPrompt, setTextEditPrompt] = useState('');
  const [isApplyingTextEdit, setIsApplyingTextEdit] = useState(false);
  const [textEditError, setTextEditError] = useState<string | null>(null);

  useEffect(() => {
    if (navigator.share) {
      setIsShareSupported(true);
    }
  }, []);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(design.rationale).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [design.rationale]);
  
  const handleApplyEdit = async (payload: EditPayload) => {
    if (!design.image) return;

    setIsApplyingEdit(true);
    setEditError(null);
    try {
        const newImage = await editImage(design.image, payload);
        onUpdate({ ...design, image: newImage });
        setIsEditModalOpen(false); // Close modal on success
    } catch(err) {
        const message = err instanceof Error ? err.message : 'Failed to apply image edit.';
        setEditError(message);
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
      const newContent = await editText(design.rationale, textEditPrompt);
      onUpdate({ ...design, rationale: newContent });
      setIsEditingText(false);
      setTextEditPrompt('');
    } catch (err) {
      setTextEditError(err instanceof Error ? err.message : 'Failed to apply text edit.');
    } finally {
      setIsApplyingTextEdit(false);
    }
  };

  const handleSaveImage = () => {
    if (!design.image) return;
    const link = document.createElement('a');
    link.href = design.image;
    const fileName = `ai-moodboard-${Date.now()}.png`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveDesign = () => {
    onSave();
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2500);
  };
  
  const dataURLtoFile = (dataurl: string, filename: string): File | null => {
    const arr = dataurl.split(',');
    if (arr.length < 2) { return null; }
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) { return null; }
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
  }

  const handleShare = async () => {
    if (!navigator.share || !design.image) return;

    const imageFile = dataURLtoFile(design.image, `ai-design-${Date.now()}.png`);
    if (!imageFile) {
        console.error("Could not convert data URL to file");
        return;
    }

    try {
      await navigator.share({
        title: 'My AI Interior Design',
        text: `Check out this interior design concept I created!\n\nDesign Rationale:\n${design.rationale}`,
        files: [imageFile],
      });
    } catch (error) {
      console.error('Error sharing design:', error);
    }
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
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden transition-all duration-300 border border-gray-200">
        <div className="p-6 md:p-8 bg-gray-50/50">
           <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">Your AI-Generated Mood Board</h2>
           <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 xl:gap-8 items-start">
              
              {/* Main Image Column */}
              <div className="lg:col-span-3">
                  <h3 className="text-xl font-semibold text-gray-800 mb-3">Final Design</h3>
                  {design.image ? (
                      <img 
                        src={design.image} 
                        alt="Generated Design" 
                        className="w-full h-auto object-contain rounded-lg bg-gray-100 p-1 border border-gray-200 shadow-md zoom-on-hover clickable-image" 
                        onClick={() => design.image && onImageClick(design.image)}
                      />
                  ) : (
                      <div className="w-full bg-gray-200 rounded-lg flex items-center justify-center aspect-video">
                          <p className="text-gray-500">Image failed to generate</p>
                      </div>
                  )}
                   {design.image && (
                      <div className="mt-4 flex items-center flex-wrap gap-x-4 gap-y-2">
                         <button onClick={() => setIsEditModalOpen(true)} className="text-sm text-blue-600 hover:text-blue-500 font-semibold flex items-center gap-1.5" disabled={isApplyingEdit}>
                             ✏️ Edit Image
                         </button>
                         <button onClick={handleSaveImage} className="text-sm text-sky-600 hover:text-sky-500 font-semibold flex items-center gap-1.5">
                             💾 Download Image
                         </button>
                         <button 
                            onClick={handleSaveDesign} 
                            className={`text-sm font-semibold flex items-center gap-1.5 transition-colors ${justSaved ? 'text-green-600' : 'text-indigo-600 hover:text-indigo-500'}`}
                            disabled={justSaved}
                         >
                             {justSaved ? '✅ Saved!' : '📂 Save Design'}
                         </button>
                         {isShareSupported && (
                           <button onClick={handleShare} className="text-sm text-emerald-600 hover:text-emerald-500 font-semibold flex items-center gap-1.5">
                              <ShareIcon className="w-4 h-4" /> Share
                           </button>
                         )}
                      </div>
                  )}
              </div>
              
              {/* Rationale & Inspiration Column */}
              <div className="lg:col-span-2 space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xl font-semibold text-gray-800">Design Rationale</h3>
                        <button
                            onClick={handleCopy}
                            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors text-gray-700 ${ copied ? 'bg-green-200 text-green-800' : `bg-gray-200 hover:bg-gray-300` }`}
                        >
                            {copied ? 'Copied!' : 'Copy'}
                        </button>
                    </div>
                    <div
                      className="text-sm text-gray-700 font-sans leading-relaxed p-4 bg-white rounded-lg border border-gray-200 prose prose-sm max-h-60 overflow-y-auto"
                      dangerouslySetInnerHTML={renderMarkdown(design.rationale)}
                    />
                    <div className="mt-3">
                      <button 
                          onClick={() => setIsEditingText(!isEditingText)} 
                          className="text-sm text-blue-600 hover:text-blue-500 font-semibold" 
                          disabled={isApplyingTextEdit}
                      >
                         {isEditingText ? 'Cancel' : '✏️ Edit with AI'}
                      </button>
                      {isEditingText && (
                          <form onSubmit={handleApplyTextEdit} className="mt-2 space-y-2">
                              <input 
                                  type="text"
                                  value={textEditPrompt}
                                  onChange={(e) => setTextEditPrompt(e.target.value)}
                                  placeholder="e.g., make this more concise"
                                  className="w-full p-2 text-sm bg-white border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500"
                              />
                              <button 
                                  type="submit" 
                                  className="w-full px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50" 
                                  disabled={isApplyingTextEdit || !textEditPrompt.trim()}
                              >
                                  {isApplyingTextEdit ? 'Applying...' : 'Apply Edit'}
                              </button>
                              {textEditError && <p className="text-xs text-red-500 mt-1">{textEditError}</p>}
                          </form>
                      )}
                    </div>
                  </div>
                  
                  {design.inspirationImages && design.inspirationImages.length > 0 && (
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-3">Inspiration Swatches</h3>
                      <div className="p-3 bg-white rounded-lg border border-gray-200">
                        <div className="grid grid-cols-3 gap-2">
                            {design.inspirationImages.map((src, index) => (
                                <img 
                                  key={index} 
                                  src={src} 
                                  alt={`Inspiration ${index + 1}`} 
                                  className="rounded-md w-full aspect-square object-cover zoom-on-hover clickable-image" 
                                  onClick={() => onImageClick(src)}
                                />
                            ))}
                        </div>
                      </div>
                    </div>
                  )}
              </div>
           </div>
        </div>
      </div>
      {design.image && (
        <AdvancedImageEditor
          isOpen={isEditModalOpen}
          onClose={() => {
              setIsEditModalOpen(false);
              setEditError(null);
          }}
          onSubmit={handleApplyEdit}
          imageUrl={design.image}
          isApplyingEdit={isApplyingEdit}
          error={editError}
        />
      )}
    </>
  );
};

export default DesignOutputCard;