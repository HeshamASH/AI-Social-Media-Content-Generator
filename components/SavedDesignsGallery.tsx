import React from 'react';
import { SavedDesign } from '../types';

interface SavedDesignsGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  designs: SavedDesign[];
  onLoad: (design: SavedDesign) => void;
  onDelete: (id: string) => void;
  onImageClick: (imageUrl: string) => void;
}

const SavedDesignsGallery: React.FC<SavedDesignsGalleryProps> = ({ isOpen, onClose, designs, onLoad, onDelete, onImageClick }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" aria-modal="true" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <header className="p-4 border-b flex justify-between items-center bg-gray-50">
          <h2 className="text-2xl font-bold text-gray-800">My Saved Designs</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-3xl font-light leading-none">&times;</button>
        </header>
        
        <main className="flex-grow overflow-y-auto p-6 bg-gray-100">
          {designs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <p className="text-gray-500 text-lg">You haven't saved any designs yet.</p>
              <p className="text-gray-400 mt-2">Generate a design and click "Save Design" to see it here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {designs.map((design) => (
                <div key={design.id} className="bg-white rounded-lg shadow-md overflow-hidden group transition-transform transform hover:-translate-y-1">
                  <div className="relative">
                    <img 
                      src={design.image || ''} 
                      alt="Saved design" 
                      className="w-full h-40 object-cover bg-gray-200 zoom-on-hover clickable-image" 
                      onClick={() => design.image && onImageClick(design.image)}
                    />
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-gray-500 mb-2">
                      Saved on {new Date(design.timestamp).toLocaleDateString()}
                    </p>
                    <div className="flex items-center space-x-2">
                       <button onClick={() => onLoad(design)} className="w-full px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold transition-colors">
                          Load
                       </button>
                       <button onClick={() => onDelete(design.id)} className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-md transition-colors" aria-label="Delete design">
                          🗑️
                       </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default SavedDesignsGallery;