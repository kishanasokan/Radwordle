'use client';

import { useState, useCallback } from 'react';
import { Condition } from '@/lib/supabase';
import DiagnosisAutocomplete from './DiagnosisAutocomplete';

interface GameClientProps {
  conditions: Condition[];
}

export default function GameClient({ conditions }: GameClientProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleSubmit = useCallback((diagnosis: string) => {
    // TODO: Implement diagnosis validation logic
    console.log('Submitted diagnosis:', diagnosis);
  }, []);

  const handleDropdownStateChange = useCallback((isOpen: boolean) => {
    setIsDropdownOpen(isOpen);
  }, []);

  return (
    <div className={`transition-all duration-300 ${isDropdownOpen ? 'pb-[450px]' : ''}`}>
      <DiagnosisAutocomplete
        conditions={conditions}
        onSubmit={handleSubmit}
        onDropdownStateChange={handleDropdownStateChange}
      />
    </div>
  );
}
