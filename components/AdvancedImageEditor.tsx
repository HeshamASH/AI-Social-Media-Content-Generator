import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Comment, EditPayload } from '../types';

interface AdvancedImageEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: EditPayload) => void;
  imageUrl: string;
  isApplyingEdit: boolean;
  error: string | null;
}

type EditorTool = 'draw' | 'comment';

const AdvancedImageEditor: React.FC<AdvancedImageEditorProps> = ({ isOpen, onClose, onSubmit, imageUrl, isApplyingEdit, error }) => {
    const [activeTab, setActiveTab] = useState<'simple' | 'advanced'>('simple');
    
    // Simple mode state
    const [simplePrompt, setSimplePrompt] = useState('');

    // Advanced mode state
    const [activeTool, setActiveTool] = useState<EditorTool>('draw');
    const [comments, setComments] = useState<Comment[]>([]);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    const resetAdvancedState = useCallback(() => {
        setComments([]);
        const canvas = canvasRef.current;
        if (canvas) {
            const context = canvas.getContext('2d');
            context?.clearRect(0, 0, canvas.width, canvas.height);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
          resetAdvancedState();
          setSimplePrompt('');
          setActiveTab('simple');
        }
    }, [isOpen, resetAdvancedState]);
    
    // Resize canvas to match image dimensions
    useEffect(() => {
        const image = imageRef.current;
        const canvas = canvasRef.current;
        if (image && canvas && isOpen && activeTab === 'advanced') {
            const setCanvasSize = () => {
                const { clientWidth, clientHeight } = image;
                if (canvas.width !== clientWidth || canvas.height !== clientHeight) {
                    canvas.width = clientWidth;
                    canvas.height = clientHeight;
                }
            };
            
            if (image.complete) {
              setCanvasSize();
            } else {
              image.onload = setCanvasSize;
            }
            
            window.addEventListener('resize', setCanvasSize);
            return () => window.removeEventListener('resize', setCanvasSize);
        }
    }, [imageUrl, isOpen, activeTab]);

    const getMousePos = (canvas: HTMLCanvasElement, e: React.MouseEvent<HTMLCanvasElement>) => {
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    };

    const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (activeTool !== 'draw') return;
        
        const canvas = canvasRef.current!;
        const context = canvas.getContext('2d')!;
        const pos = getMousePos(canvas, e);

        context.strokeStyle = '#ef4444'; // red-500
        context.lineWidth = 3;
        context.lineCap = 'round';
        context.lineJoin = 'round';
        
        context.beginPath();
        context.moveTo(pos.x, pos.y);
        setIsDrawing(true);
    };

    const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing || activeTool !== 'draw') return;

        const canvas = canvasRef.current!;
        const context = canvas.getContext('2d')!;
        const pos = getMousePos(canvas, e);
        
        context.lineTo(pos.x, pos.y);
        context.stroke();
    };

    const handleCanvasMouseUp = () => {
        if (!isDrawing || activeTool !== 'draw') return;
        setIsDrawing(false);
    };

    const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (activeTool !== 'comment') return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setComments([...comments, { id: Date.now(), x, y, text: '' }]);
    };
    
    const handleCommentTextChange = (id: number, text: string) => {
        setComments(comments.map(c => c.id === id ? { ...c, text } : c));
    };

    const handleSubmit = () => {
        if (activeTab === 'simple') {
            if (simplePrompt.trim()) {
                onSubmit({ type: 'simple', prompt: simplePrompt });
            }
        } else {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const overlayDataUrl = canvas.toDataURL('image/png'); // Get drawing as transparent PNG
            onSubmit({ type: 'advanced', overlayDataUrl, comments });
        }
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" aria-modal="true">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                <header className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold">Edit Your Design</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl font-light">&times;</button>
                </header>
                <div className="p-4 border-b">
                     <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                        <button onClick={() => setActiveTab('simple')} className={`w-full py-2 text-sm font-medium rounded-md transition-shadow ${activeTab === 'simple' ? 'bg-white shadow' : 'text-gray-600'}`}>Simple Edit</button>
                        <button onClick={() => setActiveTab('advanced')} className={`w-full py-2 text-sm font-medium rounded-md transition-shadow ${activeTab === 'advanced' ? 'bg-white shadow' : 'text-gray-600'}`}>Advanced Edit</button>
                    </div>
                </div>

                <main className="flex-grow overflow-y-auto">
                    {activeTab === 'simple' ? (
                        <div className="p-6 space-y-4">
                            <label htmlFor="simple-prompt" className="font-semibold text-gray-700">Describe your change:</label>
                            <textarea
                                id="simple-prompt"
                                value={simplePrompt}
                                onChange={(e) => setSimplePrompt(e.target.value)}
                                placeholder="e.g., make the sofa green, add a floor lamp in the corner"
                                className="w-full h-24 p-2 bg-white border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
                            <div className="md:col-span-2 relative" onClick={handleImageClick}>
                                <img ref={imageRef} src={imageUrl} alt="Design to edit" className="w-full h-auto object-contain rounded-md" />
                                <canvas ref={canvasRef} className={`absolute top-0 left-0 ${activeTool === 'draw' ? 'cursor-crosshair' : 'cursor-copy'}`} onMouseDown={handleCanvasMouseDown} onMouseMove={handleCanvasMouseMove} onMouseUp={handleCanvasMouseUp} onMouseLeave={handleCanvasMouseUp} />
                                {comments.map((comment, index) => (
                                    <div key={comment.id} className="absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full flex items-center justify-center text-white font-bold text-xs border-2 border-white shadow-lg" style={{ left: `${comment.x}%`, top: `${comment.y}%` }}>
                                        {index + 1}
                                    </div>
                                ))}
                            </div>
                            <div className="space-y-4">
                                <div className="p-3 bg-gray-50 rounded-lg border">
                                    <h4 className="font-semibold mb-2">Tools</h4>
                                    <div className="flex space-x-2">
                                        <button onClick={() => setActiveTool('draw')} className={`px-3 py-1 text-sm rounded-md border ${activeTool === 'draw' ? 'bg-blue-100 border-blue-400' : 'bg-white'}`}>Draw</button>
                                        <button onClick={() => setActiveTool('comment')} className={`px-3 py-1 text-sm rounded-md border ${activeTool === 'comment' ? 'bg-blue-100 border-blue-400' : 'bg-white'}`}>Comment</button>
                                        <button onClick={resetAdvancedState} className="px-3 py-1 text-sm rounded-md border bg-white">Clear All</button>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">
                                        {activeTool === 'draw' ? 'Click and drag on the image to draw.' : 'Click on the image to add a comment pin.'}
                                    </p>
                                </div>
                                <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                                    {comments.map((comment, index) => (
                                        <div key={comment.id} className="flex items-start space-x-2">
                                            <div className="w-6 h-6 mt-1 flex-shrink-0 bg-red-500 rounded-full flex items-center justify-center text-white font-bold text-xs">{index + 1}</div>
                                            <textarea value={comment.text} onChange={(e) => handleCommentTextChange(comment.id, e.target.value)} placeholder={`Instruction for pin ${index + 1}...`} className="w-full p-1.5 text-sm border rounded-md bg-white text-gray-800" rows={2}/>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </main>
                
                <footer className="p-4 border-t bg-gray-50">
                    {error && <p className="text-sm text-red-600 mb-2 text-center">{error}</p>}
                    <button onClick={handleSubmit} className="w-full py-2 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 disabled:opacity-50" disabled={isApplyingEdit}>
                        {isApplyingEdit ? 'Applying...' : 'Apply Edit'}
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default AdvancedImageEditor;