import React from 'react';
import { InspirationTemplate } from '../types';

interface TemplateSelectorProps {
  templates: InspirationTemplate[];
  selectedTemplate: InspirationTemplate | null;
  onSelect: (template: InspirationTemplate) => void;
  disabled?: boolean;
}

const TemplateSelector: React.FC<TemplateSelectorProps> = ({ templates, selectedTemplate, onSelect, disabled }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
      {templates.map((template) => (
        <button
          key={template.name}
          type="button"
          onClick={() => onSelect(template)}
          disabled={disabled}
          className={`p-4 rounded-lg text-left transition-all duration-200 border ${
            selectedTemplate?.name === template.name
              ? 'bg-blue-100 border-blue-500 shadow-lg ring-2 ring-blue-500/50'
              : 'bg-white border-gray-200 hover:bg-gray-100 hover:border-gray-300'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <h4 className="font-bold text-sm text-gray-800">{template.name}</h4>
          <p className="text-xs text-gray-600 mt-1 line-clamp-3">{template.description}</p>
        </button>
      ))}
    </div>
  );
};

export default TemplateSelector;