import * as React from "react";
import * as ToastPrimitives from "@radix-ui/react-toast";
import { cva } from "class-variance-authority"; 
import { X } from "lucide-react";

import { cn } from "../../lib/utils";

const ToastProvider = ToastPrimitives.Provider;

const ToastViewport = React.forwardRef( // LINHA ALTERADA (Removidas anotações de tipo genéricas)
  ({ className, ...props }, ref) => ( // LINHA ALTERADA
    <ToastPrimitives.Viewport
      ref={ref}
      className={cn(
        "fixed top-0 z-100 flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
        className,
      )}
      {...props}
    />
  )
);
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
  {
    variants: {
      variant: {
        default: "border border-gray-200 bg-white text-gray-900",
        destructive: "destructive group border-red-200 bg-red-50 text-red-900",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

// Toast Component
const Toast = React.forwardRef( // LINHA ALTERADA (Removidas anotações de tipo genéricas)
  ({ className, variant, ...props }, ref) => { // LINHA ALTERADA
    return <ToastPrimitives.Root ref={ref} className={cn(toastVariants({ variant }), className)} {...props} />;
  }
);
Toast.displayName = ToastPrimitives.Root.displayName;

// ToastAction Component
const ToastAction = React.forwardRef( // LINHA ALTERADA (Removidas anotações de tipo genéricas)
  ({ className, ...props }, ref) => ( // LINHA ALTERADA
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
const ToastClose = React.forwardRef( // LINHA ALTERADA (Removidas anotações de tipo genéricas)
  ({ className, ...props }, ref) => ( // LINHA ALTERADA
    <ToastPrimitives.Close
      ref={ref}
      className={cn(
        "absolute right-2 top-2 rounded-md p-1 text-gray-500 opacity-0 transition-opacity group-hover:opacity-100 group-[.destructive]:text-red-500 hover:text-gray-700 group-[.destructive]:hover:text-red-600 focus:opacity-100 focus:outline-none focus:ring-2 group-[.destructive]:focus:ring-red-500 group-[.destructive]:focus:ring-offset-red-50",
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

const ToastTitle = React.forwardRef( // LINHA ALTERADA (Removidas anotações de tipo genéricas)
  ({ className, ...props }, ref) => ( // LINHA ALTERADA
    <ToastPrimitives.Title ref={ref} className={cn("text-sm font-semibold", className)} {...props} />
  )
);
ToastTitle.displayName = ToastPrimitives.Title.displayName;

const ToastDescription = React.forwardRef( // LINHA ALTERADA (Removidas anotações de tipo genéricas)
  ({ className, ...props }, ref) => ( // LINHA ALTERADA
    <ToastPrimitives.Description ref={ref} className={cn("text-sm opacity-90", className)} {...props} />
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
};

// Hook para usar toast
let toastCount = 0;
const listeners = [];

export const useToast = () => {
  const [toasts, setToasts] = React.useState([]);

  React.useEffect(() => {
    listeners.push(setToasts);
    return () => listeners.splice(listeners.indexOf(setToasts), 1);
  }, []);

  const toast = (props) => {
    const id = toastCount++;
    const newToast = { id, ...props };
    
    listeners.forEach(listener => {
      listener(prev => [...prev, newToast]);
    });

    setTimeout(() => {
      listeners.forEach(listener => {
        listener(prev => prev.filter(t => t.id !== id));
      });
    }, 3000);
  };

  toast.error = (message) => toast({ variant: 'destructive', title: message });
  toast.success = (message) => toast({ title: message });

  return { toasts };
};

// Export da função toast para uso direto
export const toast = {
  error: (message) => {
    listeners.forEach(listener => {
      listener(prev => [...prev, { id: toastCount++, variant: 'destructive', title: message }]);
    });
  },
  success: (message) => {
    listeners.forEach(listener => {
      listener(prev => [...prev, { id: toastCount++, title: message }]);
    });
  },
};