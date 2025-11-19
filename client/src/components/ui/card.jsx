import * as React from "react";

import { cn } from "../../lib/utils";

// Card Component
const Card = React.forwardRef(({ className, ...props }, ref) => ( 
  <div ref={ref} className={cn("rounded-lg border border-gray-200 bg-white text-gray-900 shadow-sm", className)} {...props} />
));
Card.displayName = "Card";

// CardHeader Component
const CardHeader = React.forwardRef( 
  ({ className, ...props }, ref) => ( 
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-4 sm:p-6", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

// CardTitle Component
const CardTitle = React.forwardRef( 
  ({ className, ...props }, ref) => ( 
    <h3 ref={ref} className={cn("text-xl sm:text-2xl font-semibold leading-none tracking-tight", className)} {...props} />
  ),
);
CardTitle.displayName = "CardTitle";

// CardDescription Component
const CardDescription = React.forwardRef( 
  ({ className, ...props }, ref) => ( 
    <p ref={ref} className={cn("text-sm sm:text-base text-gray-600", className)} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";

// CardContent Component
const CardContent = React.forwardRef( 
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-4 sm:p-6 pt-0", className)} {...props} />, 
);
CardContent.displayName = "CardContent";

// CardFooter Component
const CardFooter = React.forwardRef( 
  ({ className, ...props }, ref) => ( 
    <div ref={ref} className={cn("flex items-center p-4 sm:p-6 pt-0", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };