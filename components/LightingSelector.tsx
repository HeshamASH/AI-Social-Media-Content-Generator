import React from 'react';
import { LightingTemplate, LightingType } from '../types';

interface LightingSelectorProps {
  templates: LightingTemplate[];
  selectedLighting: LightingType;
  onSelect: (lighting: LightingType) => void;
  disabled?: boolean;
}

const LightingSelector: React.FC<LightingSelectorProps> = ({ templates, selectedLighting, onSelect, disabled }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {templates.map((template) => (
        <button
          key={template.name}
          type="button"
          onClick={() => onSelect(template.name)}
          disabled={disabled}
          className={`p-4 rounded-lg text-left transition-all duration-200 border h-full flex flex-col ${
            selectedLighting === template.name
              ? 'bg-amber-50 border-amber-500 shadow-lg ring-2 ring-amber-500/50'
              : 'bg-white border-gray-200 hover:bg-gray-100 hover:border-gray-300'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <h4 className="font-bold text-sm text-gray-800">{template.name}</h4>
          <p className="text-xs text-gray-600 mt-1 flex-grow">{template.description}</p>
        </button>
      ))}
    </div>
  );
};

export default LightingSelector;