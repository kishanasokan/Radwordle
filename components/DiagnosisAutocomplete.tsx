'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Create a Map of normalized condition names to original names for O(1) lookup
  const conditionNameMap = useMemo(() => {
    const map = new Map<string, string>();
    conditions.forEach(c => map.set(c.name.toLowerCase().trim(), c.name));
    return map;
  }, [conditions]);

  // Get the exact condition name with proper casing (returns null if not found)
  const getExactConditionName = useCallback((value: string): string | null => {
    return conditionNameMap.get(value.toLowerCase().trim()) ?? null;
  }, [conditionNameMap]);

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
    // Clear validation error when user starts typing
    if (validationError) {
      setValidationError(null);
    }
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
    const trimmedValue = inputValue.trim();

    if (!trimmedValue) {
      return;
    }

    // Check if the input matches a valid condition from the list
    const exactConditionName = getExactConditionName(trimmedValue);

    if (!exactConditionName) {
      // Input doesn't match any valid condition
      setValidationError('Please select a diagnosis from the list');
      return;
    }

    // Check if already guessed
    if (isPreviouslyGuessed(exactConditionName)) {
      setValidationError('You have already guessed this diagnosis');
      return;
    }

    // Valid submission - use the exact condition name for consistency
    onSubmit(exactConditionName);
    setInputValue('');
    setIsOpen(false);
    setValidationError(null);
  };

  return (
    <div ref={containerRef} className="w-full max-w-xl mx-auto relative z-50">
      <div className="flex gap-2 sm:gap-3">
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Diagnosis..."
            aria-invalid={!!validationError}
            aria-describedby={validationError ? "diagnosis-error" : undefined}
            className={`w-full px-3 sm:px-6 py-3 sm:py-4 rounded-lg text-base sm:text-lg font-baloo-2 bg-white bg-opacity-90 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 ${
              validationError
                ? 'ring-2 ring-red-500 focus:ring-red-500'
                : 'focus:ring-yellow-400'
            }`}
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

      {/* Validation error message */}
      {validationError && (
        <div
          id="diagnosis-error"
          role="alert"
          className="mt-2 px-3 py-2 bg-red-100 border border-red-300 rounded-lg text-red-700 text-sm font-medium flex items-center gap-2"
        >
          <svg
            className="w-4 h-4 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {validationError}
        </div>
      )}
    </div>
  );
}
