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

const MouseControlIcon = ({ highlight, label }: { highlight: 'left' | 'right' | 'scroll' | 'middle'; label: string }) => {
    const isLeft = highlight === 'left';
    const isRight = highlight === 'right';
    const isScroll = highlight === 'scroll';
    const isMiddle = highlight === 'middle';

    return (
        <div className="flex flex-col items-center text-center w-16">
            <svg width="24" height="36" viewBox="0 0 24 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-500">
                <path d="M12 6C8.68629 6 6 8.68629 6 12V24C6 27.3137 8.68629 30 12 30C15.3137 30 18 27.3137 18 24V12C18 8.68629 15.3137 6 12 6Z" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 6V16" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 6C8.68629 6 6 8.68629 6 12V16H12V6Z" className={isLeft ? 'fill-blue-500' : 'fill-transparent'}/>
                <path d="M12 6V16H18V12C18 8.68629 15.3137 6 12 6Z" className={isRight ? 'fill-blue-500' : 'fill-transparent'}/>
                <rect x="11" y="7" width="2" height="6" rx="1" className={(isScroll || isMiddle) ? 'fill-blue-500' : 'fill-gray-300'}/>
            </svg>
            <span className="text-xs font-semibold text-gray-600 mt-1">{label}</span>
        </div>
    );
};

const getObjectFitSize = (img: HTMLImageElement) => {
    const { naturalWidth, naturalHeight, clientWidth, clientHeight } = img;
    const naturalAspectRatio = naturalWidth / naturalHeight;
    const clientAspectRatio = clientWidth / clientHeight;

    let renderWidth = clientWidth;
    let renderHeight = clientHeight;
    let xOffset = 0;
    let yOffset = 0;

    // Image is wider than its container, so it's letterboxed vertically
    if (naturalAspectRatio > clientAspectRatio) { 
        renderHeight = clientWidth / naturalAspectRatio;
        yOffset = (clientHeight - renderHeight) / 2;
    } 
    // Image is taller than or has the same aspect ratio as its container, so it's letterboxed horizontally
    else { 
        renderWidth = clientHeight * naturalAspectRatio;
        xOffset = (clientWidth - renderWidth) / 2;
    }
    return { renderWidth, renderHeight, xOffset, yOffset };
}

const AdvancedImageEditor: React.FC<AdvancedImageEditorProps> = ({ isOpen, onClose, onSubmit, imageUrl, isApplyingEdit, error }) => {
    const [activeTab, setActiveTab] = useState<'simple' | 'advanced'>('simple');
    
    const [simplePrompt, setSimplePrompt] = useState('');

    const [comments, setComments] = useState<Comment[]>([]);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const imageContainerRef = useRef<HTMLDivElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [canvasHistory, setCanvasHistory] = useState<ImageData[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const lastPosRef = useRef({ x: 0, y: 0 });

    const resetCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) {
            setCanvasHistory([]);
            setHistoryIndex(-1);
            return;
        }
        const context = canvas.getContext('2d');
        if (context) {
            context.clearRect(0, 0, canvas.width, canvas.height);
            const initialImageData = context.getImageData(0, 0, canvas.width, canvas.height);
            setCanvasHistory([initialImageData]);
            setHistoryIndex(0);
        }
    }, []);

    const resetAdvancedState = useCallback(() => {
        setComments([]);
        setTransform({ scale: 1, x: 0, y: 0 });
        setIsPanning(false);
        setPanStart({ x: 0, y: 0 });
        resetCanvas();
    }, [resetCanvas]);

    useEffect(() => {
        if (isOpen) {
          resetAdvancedState();
          setSimplePrompt('');
          setActiveTab('simple');
        }
    }, [isOpen, resetAdvancedState]);
    
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [isOpen]);

    useEffect(() => {
        const image = imageRef.current;
        const canvas = canvasRef.current;
        const imageContainer = imageContainerRef.current;

        if (!image || !canvas || !imageContainer || !isOpen || activeTab !== 'advanced') {
            return;
        }

        const setCanvasSize = () => {
            const { clientWidth, clientHeight } = image;
            if (clientWidth === 0 || clientHeight === 0 || image.naturalWidth === 0) {
                return;
            }

            const { renderWidth, renderHeight, xOffset, yOffset } = getObjectFitSize(image);
            
            canvas.style.left = `${xOffset}px`;
            canvas.style.top = `${yOffset}px`;
            canvas.style.width = `${renderWidth}px`;
            canvas.style.height = `${renderHeight}px`;

            if (canvas.width !== renderWidth || canvas.height !== renderHeight) {
                canvas.width = renderWidth;
                canvas.height = renderHeight;
                resetCanvas();
            }
        };

        const observer = new ResizeObserver(setCanvasSize);
        observer.observe(imageContainer);

        image.onload = setCanvasSize;
        if (image.complete) {
            setCanvasSize();
        }

        return () => {
            observer.disconnect();
            image.onload = null;
        };
    }, [isOpen, activeTab, resetCanvas]);

    const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = e.currentTarget;
        const rect = canvas.getBoundingClientRect(); // Gets the visual size/position on screen

        // Mouse position relative to the element's top-left corner
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Convert mouse position from screen space (pixels on the scaled canvas)
        // to buffer space (pixels on the actual canvas buffer).
        const canvasX = (x / rect.width) * canvas.width;
        const canvasY = (y / rect.height) * canvas.height;

        return { x: canvasX, y: canvasY };
    };
    
    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const container = e.currentTarget as HTMLElement;
        const image = imageRef.current;
        if (!image) return;

        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left; // Mouse position relative to container
        const y = e.clientY - rect.top;

        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        const newScale = Math.max(1, Math.min(transform.scale + delta, 5));
        
        if (newScale === transform.scale) return;

        const worldX = (x - transform.x) / transform.scale;
        const worldY = (y - transform.y) / transform.scale;
        
        let newX = x - worldX * newScale;
        let newY = y - worldY * newScale;

        const imageWidth = image.clientWidth;
        const imageHeight = image.clientHeight;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        const maxTx = 0;
        const maxTy = 0;
        const minTx = containerWidth - imageWidth * newScale;
        const minTy = containerHeight - imageHeight * newScale;
        
        if (imageWidth * newScale <= containerWidth) {
            newX = (containerWidth - imageWidth * newScale) / 2;
        } else {
            newX = Math.max(minTx, Math.min(newX, maxTx));
        }

        if (imageHeight * newScale <= containerHeight) {
            newY = (containerHeight - imageHeight * newScale) / 2;
        } else {
            newY = Math.max(minTy, Math.min(newY, maxTy));
        }
        
        setTransform({ scale: newScale, x: newX, y: newY });
    };

    const saveCanvasState = useCallback(() => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext('2d');
        if (!canvas || !context) return;

        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const newHistory = canvasHistory.slice(0, historyIndex + 1);
        newHistory.push(imageData);
        setCanvasHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    }, [canvasHistory, historyIndex]);

    const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        if (e.button === 0) { // Left click for drawing
            const context = canvas.getContext('2d')!;
            const pos = getMousePos(e);
            lastPosRef.current = pos; // Store starting position

            context.strokeStyle = '#ef4444'; // red-500
            context.lineWidth = 3 / transform.scale;
            context.lineCap = 'round';
            context.lineJoin = 'round';
            context.beginPath(); // Start the path here
            
            setIsDrawing(true);
        } else if (e.button === 1) { // Middle click for panning
            setIsPanning(true);
            setPanStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
        } else if (e.button === 2) { // Right click for commenting
            const pos = getMousePos(e);
            const x = (pos.x / canvas.width) * 100;
            const y = (pos.y / canvas.height) * 100;
            setComments(prev => [...prev, { id: Date.now(), x, y, text: '' }]);
        }
    };

    const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (isDrawing) {
            const canvas = canvasRef.current!;
            const context = canvas.getContext('2d')!;
            const pos = getMousePos(e);
            
            context.moveTo(lastPosRef.current.x, lastPosRef.current.y);
            context.lineTo(pos.x, pos.y);
            context.stroke();

            lastPosRef.current = pos;
            return;
        }

        if (isPanning) {
            const canvas = canvasRef.current;
            const image = imageRef.current;
            if (!canvas || !image) return;

            const newX = e.clientX - panStart.x;
            const newY = e.clientY - panStart.y;

            const imageWidth = image.clientWidth;
            const imageHeight = image.clientHeight;
            const container = canvas.parentElement!;
            const containerWidth = container.clientWidth;
            const containerHeight = container.clientHeight;
            const { scale } = transform;

            const maxTx = 0;
            const maxTy = 0;
            const minTx = containerWidth - imageWidth * scale;
            const minTy = containerHeight - imageHeight * scale;

            const constrainedX = imageWidth * scale <= containerWidth ? (containerWidth - imageWidth * scale) / 2 : Math.max(minTx, Math.min(newX, maxTx));
            const constrainedY = imageHeight * scale <= containerHeight ? (containerHeight - imageHeight * scale) / 2 : Math.max(minTy, Math.min(newY, maxTy));
            
            setTransform(t => ({ ...t, x: constrainedX, y: constrainedY }));
        }
    };

    const handleCanvasMouseUp = useCallback(() => {
        if (isDrawing) {
            setIsDrawing(false);
            saveCanvasState();
        }
        if (isPanning) {
            setIsPanning(false);
        }
    }, [isDrawing, isPanning, saveCanvasState]);

    const handleUndo = useCallback(() => {
        if (historyIndex <= 0) return;

        const newIndex = historyIndex - 1;
        const context = canvasRef.current?.getContext('2d');
        if (context && canvasHistory[newIndex]) {
            context.putImageData(canvasHistory[newIndex], 0, 0);
            setHistoryIndex(newIndex);
        }
    }, [historyIndex, canvasHistory]);

    const handleRedo = useCallback(() => {
        if (historyIndex >= canvasHistory.length - 1) return;
        
        const newIndex = historyIndex + 1;
        const context = canvasRef.current?.getContext('2d');
        if (context && canvasHistory[newIndex]) {
            context.putImageData(canvasHistory[newIndex], 0, 0);
            setHistoryIndex(newIndex);
        }
    }, [historyIndex, canvasHistory]);

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (activeTab !== 'advanced') return;
            const isTextInput = (document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'INPUT');
            if (isTextInput) return;

            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                if (e.shiftKey) handleRedo();
                else handleUndo();
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
                e.preventDefault();
                handleRedo();
            } else if (e.altKey && e.shiftKey && e.key.toLowerCase() === 'c') {
                e.preventDefault();
                resetAdvancedState();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, activeTab, handleUndo, handleRedo, resetAdvancedState]);
    
    const handleCommentTextChange = (id: number, text: string) => {
        setComments(comments.map(c => c.id === id ? { ...c, text } : c));
    };
    
    const handleRemoveComment = (idToRemove: number) => {
        setComments(comments.filter(c => c.id !== idToRemove));
    };

    const handleSubmit = () => {
        if (activeTab === 'simple') {
            if (simplePrompt.trim()) {
                onSubmit({ type: 'simple', prompt: simplePrompt });
            }
        } else {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const overlayDataUrl = canvas.toDataURL('image/png');
            onSubmit({ type: 'advanced', overlayDataUrl, comments });
        }
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" aria-modal="true">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
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
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 h-full">
                            <div ref={imageContainerRef} className="md:col-span-2 relative overflow-hidden bg-gray-100 rounded-md" onWheel={handleWheel}>
                                <div className="w-full h-full" style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`, transformOrigin: '0 0' }}>
                                    <img ref={imageRef} src={imageUrl} alt="Design to edit" className="w-full h-full object-contain" />
                                    <canvas 
                                        ref={canvasRef} 
                                        className={`absolute ${isPanning ? 'cursor-grabbing' : 'cursor-crosshair'}`}
                                        onMouseDown={handleCanvasMouseDown} 
                                        onMouseMove={handleCanvasMouseMove} 
                                        onMouseUp={handleCanvasMouseUp} 
                                        onMouseLeave={handleCanvasMouseUp} 
                                        onContextMenu={(e) => e.preventDefault()}
                                    />
                                    {comments.map((comment, index) => (
                                        <div key={comment.id} className="absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full flex items-center justify-center text-white font-bold text-xs border-2 border-white shadow-lg pointer-events-none" style={{ left: `${comment.x}%`, top: `${comment.y}%` }}>
                                            {index + 1}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-4 flex flex-col">
                                <div className="p-3 bg-gray-50 rounded-lg border">
                                    <h4 className="font-semibold mb-2">Tools</h4>
                                    <div className="flex flex-wrap gap-2">
                                        <button title="Undo (Ctrl+Z)" onClick={handleUndo} disabled={historyIndex <= 0} className="px-3 py-1 text-sm rounded-md border bg-white disabled:opacity-50">Undo</button>
                                        <button title="Redo (Ctrl+Y)" onClick={handleRedo} disabled={historyIndex >= canvasHistory.length - 1} className="px-3 py-1 text-sm rounded-md border bg-white disabled:opacity-50">Redo</button>
                                        <button title="Clear All (Alt+Shift+C)" onClick={resetAdvancedState} className="px-3 py-1 text-sm rounded-md border bg-white">Clear All</button>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">
                                        Left-click to draw. Right-click to add a comment.
                                    </p>
                                    <div className="flex justify-around items-start mt-3 pt-3 border-t">
                                        <MouseControlIcon highlight="left" label="Draw" />
                                        <MouseControlIcon highlight="right" label="Comment" />
                                        <MouseControlIcon highlight="scroll" label="Zoom" />
                                    </div>
                                </div>
                                <div className="space-y-2 flex-grow overflow-y-auto pr-2">
                                    <h4 className="font-semibold mb-2 text-gray-800">Comments</h4>
                                    {comments.length === 0 && <p className="text-sm text-gray-500">Right-click on the image to add a comment.</p>}
                                    {comments.map((comment, index) => (
                                        <div key={comment.id} className="flex items-start space-x-2">
                                            <div className="w-6 h-6 mt-1.5 flex-shrink-0 bg-red-500 rounded-full flex items-center justify-center text-white font-bold text-xs">{index + 1}</div>
                                            <textarea value={comment.text} onChange={(e) => handleCommentTextChange(comment.id, e.target.value)} placeholder={`Instruction for pin ${index + 1}...`} className="w-full p-1.5 text-sm border rounded-md bg-white text-gray-800" rows={2}/>
                                            <button onClick={() => handleRemoveComment(comment.id)} className="w-6 h-6 mt-1.5 flex-shrink-0 text-gray-400 hover:text-red-500 font-bold text-lg" aria-label="Remove comment">&times;</button>
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