
import React from 'react';

export const Checkbox = ({ checked, onCheckedChange, className = "", ...props }) => {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange && onCheckedChange(e.target.checked)}
      className={`w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 ${className}`}
      {...props}
    />
  );
};
