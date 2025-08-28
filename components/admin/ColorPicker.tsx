'use client';

import { useState } from 'react';

interface ColorPickerProps {
  label: string;
  color: string;
  onChange: (color: string) => void;
}

const presetColors = [
  '#1F2937', '#374151', '#4B5563', '#6B7280', '#9CA3AF',
  '#2C3E50', '#34495E', '#7F8C8D', '#95A5A6', '#BDC3C7',
  '#2B3A42', '#3F4E5A', '#556270', '#778390', '#9DA7B3',
  '#1A365D', '#2C5282', '#2D3748', '#4A5568', '#718096',
  '#44403C', '#57534E', '#78716C', '#A8A29E', '#D6D3D1',
  '#581C87', '#6B21A8', '#7C3AED', '#8B5CF6', '#A78BFA',
  '#7C2D12', '#9A3412', '#B45309', '#D97706', '#F59E0B',
  '#134E4A', '#065F46', '#047857', '#059669', '#10B981',
  '#1E3A8A', '#1E40AF', '#2563EB', '#3B82F6', '#60A5FA',
  '#7F1D1D', '#991B1B', '#B91C1C', '#DC2626', '#EF4444',
];

export function ColorPicker({ label, color, onChange }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customColor, setCustomColor] = useState(color);

  const handleColorSelect = (selectedColor: string) => {
    setCustomColor(selectedColor);
    onChange(selectedColor);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <label className="block text-sm font-medium mb-1 text-gray-700">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 border rounded-lg bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <div 
            className="w-6 h-6 rounded border border-gray-300"
            style={{ backgroundColor: color }}
          />
          <span className="text-gray-900">{color}</span>
        </button>
        
        <input
          type="color"
          value={customColor}
          onChange={(e) => handleColorSelect(e.target.value)}
          className="w-10 h-10 border rounded cursor-pointer"
          title="カスタムカラーを選択"
        />
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-2 p-3 bg-white border rounded-lg shadow-xl">
          <div className="grid grid-cols-5 gap-2 mb-2">
            {presetColors.map((presetColor) => (
              <button
                key={presetColor}
                type="button"
                onClick={() => handleColorSelect(presetColor)}
                className="w-8 h-8 rounded border-2 border-gray-300 hover:border-blue-500 hover:scale-110 transition-transform"
                style={{ backgroundColor: presetColor }}
                title={presetColor}
              />
            ))}
          </div>
          <div className="mt-3 pt-3 border-t">
            <input
              type="text"
              value={customColor}
              onChange={(e) => setCustomColor(e.target.value)}
              placeholder="#000000"
              className="w-full px-2 py-1 border rounded text-sm text-gray-900"
            />
            <button
              type="button"
              onClick={() => handleColorSelect(customColor)}
              className="mt-2 w-full px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              適用
            </button>
          </div>
        </div>
      )}
    </div>
  );
}