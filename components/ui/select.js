
import React, { useState } from 'react';

export const Select = ({ children, value, onValueChange }) => {
  return (
    <div className="relative">
      {React.Children.map(children, child =>
        React.cloneElement(child, { value, onValueChange })
      )}
    </div>
  );
};

export const SelectTrigger = ({ children, value, onValueChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 text-left bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        {children}
      </button>
      {React.Children.map(children, child =>
        child.type === SelectContent ? React.cloneElement(child, { isOpen, setIsOpen, onValueChange }) : null
      )}
    </div>
  );
};

export const SelectValue = ({ placeholder }) => {
  return <span className="text-gray-500">{placeholder}</span>;
};

export const SelectContent = ({ children, isOpen, setIsOpen, onValueChange }) => {
  if (!isOpen) return null;
  
  return (
    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
      {React.Children.map(children, child =>
        React.cloneElement(child, { onValueChange, setIsOpen })
      )}
    </div>
  );
};

export const SelectItem = ({ children, value, onValueChange, setIsOpen }) => {
  return (
    <div
      onClick={() => {
        onValueChange && onValueChange(value);
        setIsOpen && setIsOpen(false);
      }}
      className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
    >
      {children}
    </div>
  );
};
