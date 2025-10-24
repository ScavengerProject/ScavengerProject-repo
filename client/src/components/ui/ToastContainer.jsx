import React from 'react';
import { Toast, ToastTitle, ToastClose, ToastViewport } from './toast';

export const ToastContainer = ({ toasts = [] }) => {
  return (
    <>
      <ToastViewport />
      {toasts.map((toast) => (
        <Toast key={toast.id} variant={toast.variant}>
          <ToastTitle>{toast.title}</ToastTitle>
          <ToastClose />
        </Toast>
      ))}
    </>
  );
};
