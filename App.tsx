import React, { useState, useCallback, useEffect } from 'react';
import { RoomType, DecorStyle, GeneratedDesign, InspirationTemplate, LightingType, SavedDesign } from './types';
import { ROOM_TYPES, DECOR_STYLES, LIGHTING_TEMPLATES, INSPIRATION_TEMPLATES } from './constants';
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
      className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" 
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
  const [referenceImages, setReferenceImages] = useState<File[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<InspirationTemplate | null>(null);
  
  const [generatedDesign, setGeneratedDesign] = useState<GeneratedDesign | null>(null);
  const [generatedInspirationUrls, setGeneratedInspirationUrls] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [useGrounding, setUseGrounding] = useState<boolean>(false);
  const [useAdvancedAnalysis, setUseAdvancedAnalysis] = useState<boolean>(false);
  
  const [savedDesigns, setSavedDesigns] = useState<SavedDesign[]>([]);
  const [isGalleryOpen, setIsGalleryOpen] = useState<boolean>(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);


  useEffect(() => {
    setSavedDesigns(getSavedDesigns());
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError('Please enter a description for your design.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedDesign(null);
    setGeneratedInspirationUrls([]);

    try {
      const design = await generateDesign(description, roomType, decorStyle, lightingType, useGrounding, useAdvancedAnalysis, referenceImages);
      
      const urls = await Promise.all(
        referenceImages.map(file => new Promise<string>(resolve => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        }))
      );
      setGeneratedInspirationUrls(urls);
      setGeneratedDesign(design);

    // FIX: Corrected the syntax of the catch block from `catch(err) => {` to `catch(err) {`.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [description, roomType, decorStyle, lightingType, useGrounding, useAdvancedAnalysis, referenceImages]);
  
  const handleSelectTemplate = (template: InspirationTemplate) => {
    setSelectedTemplate(template);
    setDescription(template.description);
    setRoomType(template.roomType);
    setDecorStyle(template.decorStyle);
    if (template.lightingType) {
      setLightingType(template.lightingType);
    }
  };

  const handleSaveCurrentDesign = (editedDesign: GeneratedDesign) => {
    if (!editedDesign.image) return;
    const newDesigns = saveDesign({
        rationale: editedDesign.rationale,
        image: editedDesign.image,
        inspirationImages: generatedInspirationUrls,
    });
    setSavedDesigns(newDesigns);
  };

  const handleLoadDesign = (design: SavedDesign) => {
      setGeneratedDesign({ rationale: design.rationale, image: design.image });
      setGeneratedInspirationUrls(design.inspirationImages);
      setIsGalleryOpen(false);
      // Use a timeout to ensure the DOM has updated before scrolling
      setTimeout(() => {
        const resultElement = document.getElementById('result-card');
        resultElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
  };

  const handleDeleteDesign = (id: string) => {
      const newDesigns = deleteDesign(id);
      setSavedDesigns(newDesigns);
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
                AI Interior Design Assistant
            </h1>
            <p className="mt-6 text-lg text-gray-600 max-w-3xl mx-auto">
                Describe your dream room, and let AI generate a stunning design concept and a detailed rationale for it.
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
                  <label className="block text-xl font-semibold mb-3 text-gray-700">5. Upload Inspiration Images (Optional)</label>
                  <ReferenceImageUploader onFilesChange={setReferenceImages} disabled={isLoading} />
                </div>

                <div className="p-4 bg-gray-50 rounded-lg space-y-4 border border-gray-200">
                    <h3 className="text-xl font-semibold text-gray-700">6. Advanced Options</h3>
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
              {error && (
                <div className="text-center p-4 bg-red-100 border border-red-300 text-red-800 rounded-lg max-w-2xl mx-auto">
                  <p className="font-bold">An Error Occurred</p>
                  <p>{error}</p>
                </div>
              )}
              {generatedDesign && (
                <DesignOutputCard 
                  design={generatedDesign} 
                  inspirationImages={generatedInspirationUrls} 
                  onSave={handleSaveCurrentDesign} 
                  onImageClick={setLightboxImage}
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