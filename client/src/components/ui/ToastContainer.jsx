import React from 'react';
import { Toast, ToastTitle, ToastClose, ToastViewport, ToastProgressBar, ToastIcon } from './toast';

export const ToastContainer = ({ toasts = [] }) => {
  return (
    <>
      <ToastViewport />
      {toasts.map((toast) => (
        <Toast key={toast.id} variant={toast.variant}>
          <div className="flex items-start gap-3 px-4 pt-4 pb-3">
            <ToastIcon variant={toast.variant} />
            <ToastTitle>{toast.title}</ToastTitle>
          </div>
          <ToastProgressBar variant={toast.variant} />
          <ToastClose />
        </Toast>
      ))}
    </>
  );
};
