import React from 'react';

interface LoaderProps {
  message?: string;
  subMessage?: string;
}

const Loader: React.FC<LoaderProps> = ({ 
  message = "Generating Your Design...",
  subMessage = "The AI is designing your room and writing the rationale. Please wait a moment." 
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 bg-white/80 backdrop-blur-sm rounded-lg shadow-xl">
      <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-blue-500"></div>
      <h2 className="text-2xl font-semibold mt-6 text-gray-800">{message}</h2>
      <p className="text-gray-600 mt-2 max-w-md">
        {subMessage}
      </p>
    </div>
  );
};

export default Loader;