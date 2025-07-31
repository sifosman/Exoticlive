'use client';

import React from 'react';

interface SwitchProps {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

const Switch: React.FC<SwitchProps> = ({ id, checked, onCheckedChange }) => {
  return (
    <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
      <input
        type="checkbox"
        name={id}
        id={id}
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
        className="sr-only"
      />
      <div className={`block w-10 h-6 rounded-full ${checked ? 'bg-black' : 'bg-gray-300'}`}></div>
      <div
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200 ease-in-out transform ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      ></div>
    </div>
  );
};

export default Switch;
