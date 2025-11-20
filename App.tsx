
import React, { useState, useCallback, useEffect } from 'react';
import { RoomType, DecorStyle, GeneratedDesign, InspirationTemplate, LightingType, SavedDesign, ImageQuality } from './types';
import { ROOM_TYPES, DECOR_STYLES, LIGHTING_TEMPLATES, INSPIRATION_TEMPLATES, IMAGE_QUALITY_OPTIONS } from './constants';
import { generateDesign } from './services/geminiService';
import { getSavedDesigns, saveDesign, deleteDesign } from './utils/storage';
import DesignOutputCard from './components/SocialPostCard';
import Loader from './components/Loader';
import ReferenceImageUploader from './components/ImageAnalyzer';
import TemplateSelector from './components/TemplateSelector';
import SavedDesignsGallery from './components/SavedDesignsGallery';
import LightingSelector from './components/LightingSelector';

interface LightboxProps {
  imageUrl: string;
  onClose: () => void;
}

const Lightbox: React.FC<LightboxProps> = ({ imageUrl, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" 
      onClick={onClose}
      aria-modal="true"
    >
      <style>{`.animate-fade-in { animation: fadeIn 0.2s ease-in-out; } @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
      <button 
        onClick={onClose} 
        className="absolute top-4 right-4 text-white text-4xl font-light hover:text-gray-300 transition-colors"
        aria-label="Close image view"
      >&times;</button>
      <img 
        src={imageUrl} 
        alt="Enlarged view" 
        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the image itself
      />
    </div>
  );
};


const App: React.FC = () => {
  const [description, setDescription] = useState<string>('');
  const [roomType, setRoomType] = useState<RoomType>(RoomType.LivingRoom);
  const [decorStyle, setDecorStyle] = useState<DecorStyle>(DecorStyle.Modern);
  const [lightingType, setLightingType] = useState<LightingType>(LightingType.BrightNatural);
  const [imageQuality, setImageQuality] = useState<ImageQuality>('balanced');
  const [referenceImages, setReferenceImages] = useState<File[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<InspirationTemplate | null>(null);
  
  const [generatedDesign, setGeneratedDesign] = useState<GeneratedDesign | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<{title: string, message: string} | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [useGrounding, setUseGrounding] = useState<boolean>(false);
  const [useAdvancedAnalysis, setUseAdvancedAnalysis] = useState<boolean>(false);
  const [useExperimentalModels, setUseExperimentalModels] = useState<boolean>(false);
  
  const [savedDesigns, setSavedDesigns] = useState<SavedDesign[]>([]);
  const [isGalleryOpen, setIsGalleryOpen] = useState<boolean>(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isCurrentDesignSaved, setIsCurrentDesignSaved] = useState<boolean>(false);


  useEffect(() => {
    setSavedDesigns(getSavedDesigns());
  }, []);

  // Ensure experimental models are turned off if advanced analysis is disabled
  useEffect(() => {
    if (!useAdvancedAnalysis) {
      setUseExperimentalModels(false);
    }
  }, [useAdvancedAnalysis]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setValidationMessage('Please enter a description for your design.');
      setError(null);
      setInfoMessage(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    setInfoMessage(null);
    setValidationMessage(null);
    setGeneratedDesign(null);

    try {
      const design = await generateDesign(
          description, 
          roomType, 
          decorStyle, 
          lightingType, 
          useGrounding, 
          useAdvancedAnalysis, 
          referenceImages, 
          imageQuality,
          useExperimentalModels
      );
      setGeneratedDesign(design);
      setIsCurrentDesignSaved(false);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [description, roomType, decorStyle, lightingType, useGrounding, useAdvancedAnalysis, referenceImages, imageQuality, useExperimentalModels]);
  
  const handleSelectTemplate = (template: InspirationTemplate) => {
    setSelectedTemplate(template);
    setDescription(template.description);
    setRoomType(template.roomType);
    setDecorStyle(template.decorStyle);
    if (template.lightingType) {
      setLightingType(template.lightingType);
    }
  };

  const handleDesignUpdate = (updatedDesign: GeneratedDesign) => {
    setGeneratedDesign(updatedDesign);
    setIsCurrentDesignSaved(false);
  };

  const handleSaveDesign = () => {
    if (!generatedDesign || !generatedDesign.image) return;
    try {
      const newDesigns = saveDesign({
          rationale: generatedDesign.rationale,
          image: generatedDesign.image,
          inspirationImages: generatedDesign.inspirationImages,
      });
      setSavedDesigns(newDesigns);
      setIsCurrentDesignSaved(true);
      setError(null);
      setInfoMessage(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred while saving.';
      if (errorMessage.startsWith('STORAGE_FULL::')) {
          setInfoMessage({
              title: "Browser's Storage Is Full",
              message: errorMessage.replace('STORAGE_FULL::', '')
          });
          setError(null);
      } else {
          setError(errorMessage);
          setInfoMessage(null);
      }
    }
  };

  const handleLoadDesign = (design: SavedDesign) => {
      setGeneratedDesign({ 
        rationale: design.rationale, 
        image: design.image,
        inspirationImages: design.inspirationImages 
      });
      setIsGalleryOpen(false);
      setIsCurrentDesignSaved(true);
      // Use a timeout to ensure the DOM has updated before scrolling
      setTimeout(() => {
        const resultElement = document.getElementById('result-card');
        resultElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
  };

  const handleDeleteDesign = (id: string) => {
    try {
      const newDesigns = deleteDesign(id);
      setSavedDesigns(newDesigns);
      setInfoMessage(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete design.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 font-sans">
       <button
        onClick={() => setIsGalleryOpen(true)}
        className="fixed top-4 left-4 px-6 py-2 bg-white text-blue-600 font-semibold rounded-full shadow-md hover:bg-gray-200 transition-colors z-20"
      >
        My Saved Designs ({savedDesigns.length})
      </button>

      <div className="container mx-auto px-4 py-8 md:py-12">
        <header className="text-center mb-12">
            <h1 className="text-4xl md:text-6xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-sky-500 py-6">
                Multivra
            </h1>
            <p className="mt-6 text-lg text-gray-600 max-w-3xl mx-auto">
                Describe your design, and let the AI agents collaborate to design a stunning concept and a detailed rationale for it.
            </p>
        </header>

        <main>
          <div className="max-w-5xl mx-auto">
            <div className="bg-white p-8 rounded-2xl shadow-2xl border border-gray-200">
              <form onSubmit={handleSubmit} className="space-y-8">
                <div>
                  <label className="block text-xl font-semibold mb-3 text-gray-700">Start with an Inspiration</label>
                  <TemplateSelector 
                    templates={INSPIRATION_TEMPLATES}
                    selectedTemplate={selectedTemplate}
                    onSelect={handleSelectTemplate}
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-xl font-semibold mb-3 text-gray-700">1. Describe your vision</label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      setSelectedTemplate(null);
                    }}
                    placeholder="e.g., A minimalist living room with a large, comfortable sofa, a statement coffee table, and plenty of natural light..."
                    className="w-full h-32 p-4 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    disabled={isLoading}
                  />
                </div>
                
                <div>
                  <label className="block text-xl font-semibold mb-3 text-gray-700">2. Select a Room Type</label>
                  <div className="flex flex-wrap gap-3">
                    {ROOM_TYPES.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setRoomType(t);
                          setSelectedTemplate(null);
                        }}
                        className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 ${ roomType === t ? 'bg-blue-600 text-white shadow-lg scale-105' : 'bg-gray-200 text-gray-700 hover:bg-gray-300' }`}
                        disabled={isLoading}
                      >{t}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xl font-semibold mb-3 text-gray-700">3. Select a Decor Style</label>
                  <div className="flex flex-wrap gap-3">
                    {DECOR_STYLES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          setDecorStyle(s);
                          setSelectedTemplate(null);
                        }}
                        className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 ${ decorStyle === s ? 'bg-sky-600 text-white shadow-lg scale-105' : 'bg-gray-200 text-gray-700 hover:bg-gray-300' }`}
                        disabled={isLoading}
                      >{s}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xl font-semibold mb-3 text-gray-700">4. Choose Lighting</label>
                  <LightingSelector 
                    templates={LIGHTING_TEMPLATES}
                    selectedLighting={lightingType}
                    onSelect={(l) => {
                      setLightingType(l);
                      setSelectedTemplate(null);
                    }}
                    disabled={isLoading}
                  />
                </div>

                 <div>
                    <label className="block text-xl font-semibold mb-3 text-gray-700">5. Select Image Quality</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {IMAGE_QUALITY_OPTIONS.map((option) => (
                            <button
                                key={option.id}
                                type="button"
                                onClick={() => setImageQuality(option.id)}
                                disabled={isLoading}
                                className={`p-4 rounded-lg text-left transition-all duration-200 border h-full flex flex-col ${
                                imageQuality === option.id
                                    ? 'bg-indigo-50 border-indigo-500 shadow-lg ring-2 ring-indigo-500/50'
                                    : 'bg-white border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <h4 className="font-bold text-sm text-gray-800">{option.name}</h4>
                                <p className="text-xs text-gray-600 mt-1 flex-grow">{option.description}</p>
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                  <label className="block text-xl font-semibold mb-3 text-gray-700">6. Upload Inspiration Images (Optional)</label>
                  <ReferenceImageUploader onFilesChange={setReferenceImages} disabled={isLoading} />
                </div>

                <div className="p-4 bg-gray-50 rounded-lg space-y-4 border border-gray-200">
                    <h3 className="text-xl font-semibold text-gray-700">7. Advanced Options</h3>
                    <div className="flex items-center justify-between">
                        <label htmlFor="grounding-toggle" className="flex flex-col cursor-pointer">
                            <span className="font-medium text-gray-800">Use Latest Trends (via Google Search)</span>
                            <span className="text-sm text-gray-500">For designs incorporating recent decor trends.</span>
                        </label>
                        <button type="button" role="switch" aria-checked={useGrounding} onClick={() => setUseGrounding(!useGrounding)} className={`${useGrounding ? 'bg-blue-600' : 'bg-gray-300'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors`} id="grounding-toggle"><span className={`${useGrounding ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}/></button>
                    </div>
                     <div className="flex items-center justify-between">
                        <label htmlFor="analysis-toggle" className="flex flex-col cursor-pointer">
                            <span className="font-medium text-gray-800">AI Interior Designer Review</span>
                            <span className="text-sm text-gray-500">AI designer analyzes and improves the design. (Slower)</span>
                        </label>
                        <button type="button" role="switch" aria-checked={useAdvancedAnalysis} onClick={() => setUseAdvancedAnalysis(!useAdvancedAnalysis)} className={`${useAdvancedAnalysis ? 'bg-blue-600' : 'bg-gray-300'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors`} id="analysis-toggle"><span className={`${useAdvancedAnalysis ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}/></button>
                    </div>
                    
                    {useAdvancedAnalysis && (
                        <div className="flex items-center justify-between pl-4 border-l-2 border-purple-200 ml-1 mt-1 animate-fade-in-fast">
                            <label htmlFor="experimental-toggle" className="flex flex-col cursor-pointer">
                                <span className="font-medium text-purple-800">Use New Preview Models (Gemini 3.0)</span>
                                <span className="text-sm text-purple-600">Design Reviewer: Gemini 3 Pro | Editor: Nano Banana 3 Pro</span>
                            </label>
                            <button type="button" role="switch" aria-checked={useExperimentalModels} onClick={() => setUseExperimentalModels(!useExperimentalModels)} className={`${useExperimentalModels ? 'bg-purple-600' : 'bg-gray-300'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors`} id="experimental-toggle"><span className={`${useExperimentalModels ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}/></button>
                        </div>
                    )}
                </div>

                <button
                  type="submit"
                  className="w-full py-4 text-lg font-bold text-white bg-gradient-to-r from-blue-600 to-sky-600 rounded-lg hover:from-blue-700 hover:to-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-transform"
                  disabled={isLoading}
                >
                  {isLoading ? 'Generating...' : '✨ Generate My Design'}
                </button>
              </form>
            </div>

            <div id="result-card" className="mt-16">
              {isLoading && <Loader subMessage={useAdvancedAnalysis ? 'The AI Interior Designer is reviewing your room for quality and accuracy. This may take longer.' : undefined} />}
              {infoMessage && (
                <div className="text-center p-4 mb-4 bg-gray-100 border border-gray-300 text-gray-700 rounded-lg max-w-2xl mx-auto">
                  <p className="font-bold">{infoMessage.title}</p>
                  <p>{infoMessage.message}</p>
                </div>
              )}
              {validationMessage && (
                <div className="text-center p-4 mb-4 bg-gray-100 border border-gray-300 text-gray-700 rounded-lg max-w-2xl mx-auto">
                  <p>{validationMessage}</p>
                </div>
              )}
              {error && (
                <div className="text-center p-4 mb-4 bg-red-100 border border-red-300 text-red-800 rounded-lg max-w-2xl mx-auto">
                  <p className="font-bold">An Error Occurred</p>
                  <p>{error}</p>
                </div>
              )}
              {generatedDesign && (
                <DesignOutputCard 
                  design={generatedDesign} 
                  onSave={handleSaveDesign}
                  onUpdate={handleDesignUpdate}
                  onImageClick={setLightboxImage}
                  isSaved={isCurrentDesignSaved}
                  useExperimental={useExperimentalModels}
                />
              )}
            </div>
          </div>
        </main>
        
        <SavedDesignsGallery 
            isOpen={isGalleryOpen}
            onClose={() => setIsGalleryOpen(false)}
            designs={savedDesigns}
            onLoad={handleLoadDesign}
            onDelete={handleDeleteDesign}
            onImageClick={setLightboxImage}
        />
        {lightboxImage && (
          <Lightbox imageUrl={lightboxImage} onClose={() => setLightboxImage(null)} />
        )}
      </div>
    </div>
  );
};

export default App;
