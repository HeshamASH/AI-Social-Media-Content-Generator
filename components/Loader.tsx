import React, { useState, useEffect } from 'react';

interface LoaderProps {
  message?: string;
  subMessage?: string;
}

// These steps simulate the AI's thought process, providing feedback to the user.
const GENERATION_STEPS = [
    "Analyzing your vision...",
    "Consulting design principles...",
    "Sketching initial concepts...",
    "Selecting color palettes & materials...",
    "Rendering the final design...",
    "Applying finishing touches...",
];

const Loader: React.FC<LoaderProps> = ({ 
  message = "Generating Your Design...",
  subMessage 
}) => {
  const [currentStepText, setCurrentStepText] = useState(GENERATION_STEPS[0]);

  useEffect(() => {
    let stepIndex = 0;
    const interval = setInterval(() => {
      // Cycle through the steps, creating a sense of progress
      stepIndex = (stepIndex + 1) % GENERATION_STEPS.length;
      setCurrentStepText(GENERATION_STEPS[stepIndex]);
    }, 2500); // Change step every 2.5 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center text-center p-8 bg-white/80 backdrop-blur-sm rounded-lg shadow-xl">
      <div className="loader-dots flex space-x-2">
        <div className="dot1 w-4 h-4 bg-blue-500 rounded-full"></div>
        <div className="dot2 w-4 h-4 bg-blue-500 rounded-full"></div>
        <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
      </div>
      <h2 className="text-2xl font-semibold mt-6 text-gray-800">{message}</h2>
      {/* Container to prevent layout shift as text changes */}
      <div className="h-6 mt-2">
        {/* The key forces a remount on change, allowing for a fade-in animation */}
        <p className="text-gray-600 animate-fade-in-fast" key={currentStepText}>
          {currentStepText}
        </p>
      </div>
      {subMessage && (
        <p className="text-sm text-gray-500 mt-4 max-w-md bg-gray-100 p-2 rounded-md border border-gray-200">
          {subMessage}
        </p>
      )}
    </div>
  );
};

export default Loader;