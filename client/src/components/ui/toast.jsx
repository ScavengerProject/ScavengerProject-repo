import * as React from "react";
import * as ToastPrimitives from "@radix-ui/react-toast";
import { cva } from "class-variance-authority"; 
import { X, AlertCircle, CheckCircle2 } from "lucide-react";

import { cn } from "../../lib/utils";

const ToastProvider = ToastPrimitives.Provider;

const ToastViewport = React.forwardRef(
  ({ className, ...props }, ref) => (
    <ToastPrimitives.Viewport
      ref={ref}
      className={cn(
        "fixed top-0 z-100 flex max-h-screen w-full flex-col-reverse gap-3 p-4 sm:bottom-4 sm:right-4 sm:top-auto sm:flex-col md:max-w-[420px]",
        className,
      )}
      {...props}
    />
  )
);
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

// Adicionar estilo global para animação da barra de progresso
const toastProgressBarStyle = `
  @keyframes toastProgress {
    from {
      width: 100%;
    }
    to {
      width: 0%;
    }
  }
  
  .toast-progress-bar {
    animation: toastProgress 5s linear forwards;
  }

  @keyframes toastSlideIn {
    from {
      transform: translateY(-100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .toast-enter {
    animation: toastSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }
`;

// Injetar estilo global
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = toastProgressBarStyle;
  document.head.appendChild(style);
}

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full flex-col overflow-hidden rounded-lg border shadow-lg transition-all duration-300 toast-enter data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
  {
    variants: {
      variant: {
        default: "border-blue-100 bg-gradient-to-br from-blue-50 to-white text-gray-900 shadow-blue-100/50",
        destructive: "border-red-200 bg-gradient-to-br from-red-50 to-white text-red-900 shadow-red-100/50",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

// Toast Component
const Toast = React.forwardRef(
  ({ className, variant, ...props }, ref) => {
    return <ToastPrimitives.Root ref={ref} className={cn(toastVariants({ variant }), className)} {...props} />;
  }
);
Toast.displayName = ToastPrimitives.Root.displayName;

// ToastAction Component
const ToastAction = React.forwardRef(
  ({ className, ...props }, ref) => (
    <ToastPrimitives.Action
      ref={ref}
      className={cn(
        "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-white transition-colors group-[.destructive]:border-red-200 hover:bg-gray-100 group-[.destructive]:hover:border-red-300 group-[.destructive]:hover:bg-red-100 group-[.destructive]:hover:text-red-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 group-[.destructive]:focus:ring-red-500 disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    />
  )
);
ToastAction.displayName = ToastPrimitives.Action.displayName;

// ToastClose Component
const ToastClose = React.forwardRef(
  ({ className, ...props }, ref) => (
    <ToastPrimitives.Close
      ref={ref}
      className={cn(
        "absolute right-3 top-3 rounded-md p-1 text-gray-400 opacity-0 transition-all duration-200 group-hover:opacity-100 group-[.destructive]:text-red-400 hover:text-gray-600 group-[.destructive]:hover:text-red-600 hover:bg-gray-100/50 group-[.destructive]:hover:bg-red-100/30 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-300 group-[.destructive]:focus:ring-red-300",
        className,
      )}
      toast-close=""
      {...props}
    >
      <X className="h-4 w-4" />
    </ToastPrimitives.Close>
  )
);
ToastClose.displayName = ToastPrimitives.Close.displayName;

// ToastProgressBar Component
const ToastProgressBar = React.forwardRef(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "h-1 toast-progress-bar",
        variant === 'destructive' ? 'bg-linear-to-r from-red-400 to-red-600' : 'bg-linear-to-r from-blue-400 to-blue-600',
        className,
      )}
      {...props}
    />
  )
);
ToastProgressBar.displayName = "ToastProgressBar";

// Toast Icon Component
const ToastIcon = React.forwardRef(
  ({ variant, ...props }, ref) => {
    const IconComponent = variant === 'destructive' ? AlertCircle : CheckCircle2;
    return (
      <div ref={ref} className="shrink-0">
        <IconComponent 
          className={cn(
            "h-5 w-5",
            variant === 'destructive' ? 'text-red-500' : 'text-blue-500'
          )}
        />
      </div>
    );
  }
);
ToastIcon.displayName = "ToastIcon";

const ToastTitle = React.forwardRef(
  ({ className, ...props }, ref) => (
    <ToastPrimitives.Title 
      ref={ref} 
      className={cn("text-sm font-semibold leading-tight", className)} 
      {...props} 
    />
  )
);
ToastTitle.displayName = ToastPrimitives.Title.displayName;

const ToastDescription = React.forwardRef(
  ({ className, ...props }, ref) => (
    <ToastPrimitives.Description 
      ref={ref} 
      className={cn("text-xs opacity-80 mt-1", className)} 
      {...props} 
    />
  )
);
ToastDescription.displayName = ToastPrimitives.Description.displayName;

export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
  ToastProgressBar,
  ToastIcon,
};

// Hook para usar toast
let toastCount = 0;
const listeners = new Set();
const TOAST_TIMEOUT = 5000; // 5 segundos
let toastQueue = [];
let isProcessing = false;

const processQueue = () => {
  if (isProcessing || toastQueue.length === 0) return;
  
  isProcessing = true;
  const toast = toastQueue.shift();
  
  listeners.forEach(listener => {
    listener(prev => [...prev, toast]);
  });

  setTimeout(() => {
    listeners.forEach(listener => {
      listener(prev => prev.filter(t => t.id !== toast.id));
    });
    isProcessing = false;
    processQueue();
  }, TOAST_TIMEOUT);
};

export const useToast = () => {
  const [toasts, setToasts] = React.useState([]);

  React.useEffect(() => {
    listeners.add(setToasts);
    return () => listeners.delete(setToasts);
  }, []);

  const toast = (props) => {
    const id = toastCount++;
    const newToast = { id, ...props };
    toastQueue.push(newToast);
    processQueue();
  };

  toast.error = (message) => toast({ variant: 'destructive', title: message });
  toast.success = (message) => toast({ title: message });

  return { toasts };
};

// Export da função toast para uso direto (sem acúmulo)
const toastInstance = {
  error: (message) => {
    const id = toastCount++;
    const newToast = { id, variant: 'destructive', title: message };
    
    listeners.forEach(listener => {
      listener(prev => [...prev, newToast]);
    });

    setTimeout(() => {
      listeners.forEach(listener => {
        listener(prev => prev.filter(t => t.id !== id));
      });
    }, TOAST_TIMEOUT);
  },
  success: (message) => {
    const id = toastCount++;
    const newToast = { id, title: message };
    
    listeners.forEach(listener => {
      listener(prev => [...prev, newToast]);
    });

    setTimeout(() => {
      listeners.forEach(listener => {
        listener(prev => prev.filter(t => t.id !== id));
      });
    }, TOAST_TIMEOUT);
  },
};

export const toast = toastInstance;