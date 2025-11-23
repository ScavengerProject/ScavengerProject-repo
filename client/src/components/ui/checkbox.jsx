import React from 'react';
import { Check } from 'lucide-react';

export const Checkbox = React.forwardRef(({ id, checked, onCheckedChange, ...props }, ref) => {
  return (
    <button
      id={id}
      ref={ref}
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={`
        peer h-4 w-4 shrink-0 rounded-sm border 
        transition-colors focus-visible:outline-none focus-visible:ring-2 
        focus-visible:ring-blue-500 focus-visible:ring-offset-2 
        ${checked ? 'border-blue-600 bg-blue-600' : 'border-gray-300 bg-white'}
      `}
      {...props}
    >
      {checked && <Check className="h-4 w-4 text-white" />}
    </button>
  );
});

Checkbox.displayName = "Checkbox";