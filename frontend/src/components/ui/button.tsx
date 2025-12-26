import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25 hover:from-cyan-600 hover:to-blue-600 hover:shadow-cyan-500/40 hover:scale-105',
        destructive:
          'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20',
        outline:
          'border border-white/10 bg-white/5 hover:bg-white/10 hover:border-cyan-500/50',
        secondary:
          'bg-gray-800 text-gray-100 hover:bg-gray-700',
        ghost:
          'hover:bg-white/5 hover:text-gray-100',
        link:
          'text-cyan-400 underline-offset-4 hover:underline',
        success:
          'bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-lg px-3 text-xs',
        lg: 'h-12 rounded-xl px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
