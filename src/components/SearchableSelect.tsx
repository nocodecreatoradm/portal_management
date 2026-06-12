import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  name?: string;
  emptyMessage?: string;
  customAction?: {
    value: string;
    label: string;
    onClick: () => void;
  };
  inputClassName?: string;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Seleccionar...',
  disabled = false,
  required = false,
  className = '',
  name,
  emptyMessage = 'No se encontraron opciones',
  customAction,
  inputClassName = ''
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Find current selected option
  const selectedOption = options.find(opt => opt.value === value);

  // Sync search term with selected value when dropdown is closed
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm(selectedOption ? selectedOption.label : '');
    }
  }, [value, selectedOption, isOpen]);

  // Handle outside clicks to close the dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputFocus = () => {
    if (disabled) return;
    setIsOpen(true);
    // Select all text in the input when focused so the user can easily overwrite it
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.select();
      }
    }, 50);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const handleOptionClick = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const handleChevronClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    if (isOpen) {
      setIsOpen(false);
    } else {
      setIsOpen(true);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  // Filter options based on search term
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          required={required && !value}
          disabled={disabled}
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          className={inputClassName || `w-full border border-gray-300 rounded-lg pl-3 pr-10 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
            disabled ? 'bg-gray-100 cursor-not-allowed text-gray-500 border-gray-300' : 'bg-white text-gray-800'
          }`}
          autoComplete="off"
        />
        
        {/* Hidden input for form integration if name is provided */}
        {name && (
          <input type="hidden" name={name} value={value} />
        )}

        {/* Chevron Button */}
        <button
          type="button"
          onClick={handleChevronClick}
          disabled={disabled}
          className="absolute right-0 top-0 bottom-0 px-3 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ChevronDown size={18} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Dropdown list */}
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filteredOptions.length > 0 ? (
            <div className="p-1 space-y-0.5">
              {filteredOptions.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleOptionClick(option.value)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-all text-left ${
                      isSelected ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <span className="truncate">{option.label}</span>
                    {isSelected && <Check size={14} className="text-blue-600 shrink-0" strokeWidth={3} />}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-4 text-center">
              {customAction ? (
                <button
                  type="button"
                  onClick={() => {
                    customAction.onClick();
                    setIsOpen(false);
                  }}
                  className="text-sm text-blue-600 font-bold hover:underline"
                >
                  {customAction.label}
                </button>
              ) : (
                <p className="text-xs text-gray-400 italic">{emptyMessage}</p>
              )}
            </div>
          )}

          {/* Special custom action (e.g. Add provider) if there are matching options but we also want to display it */}
          {customAction && filteredOptions.length > 0 && (
            <div className="border-t border-gray-100 p-1">
              <button
                type="button"
                onClick={() => {
                  customAction.onClick();
                  setIsOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-blue-600 font-bold hover:bg-blue-50 rounded-md transition-all"
              >
                {customAction.label}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
