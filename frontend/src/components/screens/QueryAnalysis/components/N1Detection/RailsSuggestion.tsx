import { memo, useState } from 'react';
import { Copy, Check, Code2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface RailsSuggestionProps {
  table: string;
  model?: string;
  association?: string;
  className?: string;
}

interface FixOption {
  method: string;
  code: string;
  title: string;
  description: string;
  whenToUse: string;
}

export const RailsSuggestion = memo<RailsSuggestionProps>(
  ({ table, model, association, className }) => {
    const [copiedMethod, setCopiedMethod] = useState<string | null>(null);

    const modelName = model || capitalizeFirstLetter(singularize(table));
    const assocName = association || table;

    const fixOptions: FixOption[] = [
      {
        method: 'includes',
        code: `${modelName}.includes(:${assocName})`,
        title: 'includes() - Recommended',
        description: 'Eager loads with separate queries (default choice)',
        whenToUse: 'Best for most cases. Uses separate queries which is cache-friendly.',
      },
      {
        method: 'preload',
        code: `${modelName}.preload(:${assocName})`,
        title: 'preload() - Separate Queries',
        description: 'Explicitly uses separate queries',
        whenToUse: 'When you want to ensure separate queries are used (cache-friendly).',
      },
      {
        method: 'eager_load',
        code: `${modelName}.eager_load(:${assocName})`,
        title: 'eager_load() - JOIN',
        description: 'Uses LEFT OUTER JOIN (single query)',
        whenToUse: 'When you need to filter/sort by associated records or have complex conditions.',
      },
    ];

    const handleCopy = (code: string, method: string) => {
      navigator.clipboard.writeText(code);
      setCopiedMethod(method);
      toast.success(`${method}() copied to clipboard`);
      setTimeout(() => setCopiedMethod(null), 2000);
    };

    return (
      <div className={cn('space-y-3', className)}>
        <div className="flex items-center gap-2 mb-3">
          <Code2 className="w-4 h-4 text-cyan-400" />
          <h4 className="text-sm font-medium text-white">Rails Fix Options</h4>
        </div>

        {fixOptions.map((option) => {
          const isCopied = copiedMethod === option.method;

          return (
            <div
              key={option.method}
              className={cn(
                'p-3 rounded-lg border transition-all',
                option.method === 'includes'
                  ? 'border-cyan-500/30 bg-cyan-500/5'
                  : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-white">{option.title}</span>
                    {option.method === 'includes' && (
                      <span className="text-xs px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded">
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">{option.description}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(option.code, option.method)}
                  className="h-7 px-2 flex-shrink-0"
                >
                  {isCopied ? (
                    <Check className="w-3 h-3 text-green-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </Button>
              </div>

              <pre className="text-xs text-cyan-300 bg-gray-900/50 p-2 rounded font-mono overflow-x-auto border border-gray-700">
                {option.code}
              </pre>

              <p className="text-xs text-gray-500 mt-2 italic">
                <span className="text-gray-400 font-medium">When to use:</span> {option.whenToUse}
              </p>
            </div>
          );
        })}

        {/* Additional Tips */}
        <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700 text-xs">
          <p className="text-gray-400 mb-2">
            <span className="text-white font-medium">💡 Tip:</span> For nested associations, use:
          </p>
          <code className="text-cyan-300 bg-gray-900/50 px-2 py-1 rounded">
            {modelName}.includes({`{${assocName}: :nested_association}`})
          </code>
        </div>
      </div>
    );
  }
);

RailsSuggestion.displayName = 'RailsSuggestion';

// Helper functions
function capitalizeFirstLetter(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function singularize(str: string): string {
  // Simple singularization (remove trailing 's')
  if (str.endsWith('ies')) {
    return str.slice(0, -3) + 'y';
  }
  if (str.endsWith('s')) {
    return str.slice(0, -1);
  }
  return str;
}
