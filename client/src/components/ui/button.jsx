import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority"; // Removida a importação de 'type VariantProps'

import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 touch-manipulation",
  {
    variants: {
      variant: {
        default: "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800",
        destructive: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800",
        outline: "border border-gray-300 bg-white hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200",
        secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300 active:bg-gray-400",
        ghost: "hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200",
        link: "text-blue-600 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2 text-sm sm:text-base",
        sm: "h-9 rounded-md px-3 text-xs sm:text-sm",
        lg: "h-12 sm:h-11 rounded-md px-6 sm:px-8 text-base sm:text-lg",
        icon: "h-10 w-10 sm:h-10 sm:w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

// Interface ButtonProps e anotação de tipo VariantProps são removidas no JS

const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => { // Removida a anotação de tipo dos props e do ref
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };