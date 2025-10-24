import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva } from "class-variance-authority";

import { cn } from "../../lib/utils";

const labelVariants = cva("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70");

// A anotação de tipo de React.forwardRef é removida
const Label = React.forwardRef(
  ({ className, ...props }, ref) => ( // Linha Alterada (Removida a tipagem dos props e do ref)
    <LabelPrimitive.Root ref={ref} className={cn(labelVariants(), className)} {...props} />
  )
);
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };