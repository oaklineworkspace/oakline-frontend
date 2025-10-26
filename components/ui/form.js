
import React from 'react';

export const Form = ({ children, ...props }) => {
  // Filter out React Hook Form specific props to prevent them from being passed to the DOM
  const {
    handleSubmit,
    setValue,
    getValues,
    resetField,
    clearErrors,
    setError,
    setFocus,
    getFieldState,
    formState,
    subscribe,
    trigger,
    register,
    watch,
    reset,
    unregister,
    control,
    ...formProps
  } = props;
  
  return <form {...formProps}>{children}</form>;
};

export const FormField = ({ name, control, render }) => {
  return render({ field: { name } });
};

export const FormItem = ({ children, className = "" }) => {
  return <div className={`space-y-2 ${className}`}>{children}</div>;
};

export const FormLabel = ({ children, className = "" }) => {
  return <label className={`block text-sm font-medium text-gray-700 ${className}`}>{children}</label>;
};

export const FormControl = ({ children }) => {
  return <div>{children}</div>;
};

export const FormMessage = ({ children }) => {
  return children ? <p className="text-sm text-red-600">{children}</p> : null;
};
