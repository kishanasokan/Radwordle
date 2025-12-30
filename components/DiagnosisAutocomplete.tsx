'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Condition } from '@/lib/supabase';

interface DiagnosisAutocompleteProps {
  conditions: Condition[];
  onSubmit: (diagnosis: string) => void;
  onDropdownStateChange: (isOpen: boolean) => void;
  previousGuesses?: string[];
  isMobile?: boolean;
}

export default function DiagnosisAutocomplete({
  conditions,
  onSubmit,
  onDropdownStateChange,
  previousGuesses = [],
  isMobile = false
}: DiagnosisAutocompleteProps) {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Efficient search with memoization
  const filteredConditions = useMemo(() => {
    if (!inputValue.trim()) {
      return [];
    }

    const searchTerm = inputValue.toLowerCase().trim();

    // Filter conditions that match name only
    const matches = conditions.filter((condition) => {
      return condition.name.toLowerCase().includes(searchTerm);
    });

    // Limit to 40 results for performance
    return matches.slice(0, 40);
  }, [inputValue, conditions]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setIsOpen(value.trim().length > 0);
    setSelectedIndex(-1);
  };

  // Check if a condition was previously guessed (case-insensitive)
  const isPreviouslyGuessed = (conditionName: string) => {
    const normalizedName = conditionName.toLowerCase().trim();
    return previousGuesses.some(
      guess => guess.toLowerCase().trim() === normalizedName
    );
  };

  // Handle option selection
  const handleSelectOption = (conditionName: string) => {
    // Prevent selection of previously guessed conditions
    if (isPreviouslyGuessed(conditionName)) {
      return;
    }

    setInputValue(conditionName);
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || filteredConditions.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        // Skip previously guessed items
        let nextIndex = selectedIndex + 1;
        while (
          nextIndex < filteredConditions.length &&
          isPreviouslyGuessed(filteredConditions[nextIndex].name)
        ) {
          nextIndex++;
        }
        if (nextIndex < filteredConditions.length) {
          setSelectedIndex(nextIndex);
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        // Skip previously guessed items
        let prevIndex = selectedIndex - 1;
        while (prevIndex >= 0 && isPreviouslyGuessed(filteredConditions[prevIndex].name)) {
          prevIndex--;
        }
        setSelectedIndex(prevIndex);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < filteredConditions.length) {
          const selectedCondition = filteredConditions[selectedIndex].name;
          if (!isPreviouslyGuessed(selectedCondition)) {
            handleSelectOption(selectedCondition);
          }
        } else {
          handleSubmit();
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && dropdownRef.current) {
      const selectedElement = dropdownRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  // Notify parent component when dropdown state changes and scroll into view
  useEffect(() => {
    const isDropdownVisible = isOpen && filteredConditions.length > 0;
    onDropdownStateChange(isDropdownVisible);

    // When dropdown opens, scroll to ensure dropdown options are visible (desktop only)
    if (isDropdownVisible && dropdownRef.current && !isMobile) {
      // Small delay to allow the dropdown to render and parent padding to be applied
      setTimeout(() => {
        dropdownRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }
  }, [isOpen, filteredConditions.length, onDropdownStateChange, isMobile]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = () => {
    if (inputValue.trim()) {
      onSubmit(inputValue.trim());
      setInputValue('');
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="w-full max-w-xl mx-auto flex gap-2 sm:gap-3 relative z-50">
      <div className="flex-1 relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Diagnosis..."
          className="w-full px-3 sm:px-6 py-3 sm:py-4 rounded-lg text-base sm:text-lg font-baloo-2 bg-white bg-opacity-90 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          autoComplete="off"
        />

        {/* Dropdown menu - appears above on mobile, below on desktop */}
        {isOpen && filteredConditions.length > 0 && (
          <div
            className={`absolute left-0 right-0 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 overflow-hidden ${
              isMobile ? 'bottom-full mb-2' : 'top-full mt-2'
            }`}
          >
            <div
              ref={dropdownRef}
              className="overflow-y-auto"
              style={{ maxHeight: '180px' }}
            >
              {filteredConditions.map((condition, index) => {
                const isDisabled = isPreviouslyGuessed(condition.name);

                return (
                  <button
                    key={condition.id}
                    onClick={() => handleSelectOption(condition.name)}
                    disabled={isDisabled}
                    className={`w-full text-left px-6 py-3 transition-colors border-b border-gray-100 last:border-b-0 ${
                      isDisabled
                        ? 'cursor-not-allowed bg-gray-50'
                        : 'hover:bg-blue-50'
                    } ${
                      index === selectedIndex && !isDisabled ? 'bg-blue-100' : ''
                    }`}
                  >
                    <div className={`font-medium ${isDisabled ? 'text-gray-400' : 'text-gray-800'}`}>
                      {condition.name}
                      {isDisabled && (
                        <span className="ml-2 text-xs">(Previously selected)</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Result count indicator */}
            {filteredConditions.length === 40 && (
              <div className="px-6 py-2 bg-gray-50 text-xs text-gray-500 text-center border-t border-gray-200">
                Showing first 40 results. Type more to narrow down.
              </div>
            )}
          </div>
        )}
      </div>

      <button
        onClick={handleSubmit}
        className="px-4 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-[#f59e0b] to-[#fbbf24] hover:from-[#f59e0b] hover:to-[#f59e0b] text-black font-bold font-baloo-2 text-base sm:text-lg rounded-lg transition-all shadow-lg"
      >
        Submit
      </button>
    </div>
  );
}
