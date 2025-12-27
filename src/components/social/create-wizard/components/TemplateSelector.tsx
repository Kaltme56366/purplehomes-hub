import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { IMEJIS_TEMPLATES } from '@/services/imejis/templates';
import { Check } from 'lucide-react';

interface TemplateSelectorProps {
  selectedTemplateId: string | null;
  onSelect: (templateId: string) => void;
}

export default function TemplateSelector({
  selectedTemplateId,
  onSelect,
}: TemplateSelectorProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {IMEJIS_TEMPLATES.map((template) => (
        <Card
          key={template.id}
          onClick={() => onSelect(template.id)}
          className={cn(
            "cursor-pointer transition-all hover:border-purple-400 overflow-hidden",
            selectedTemplateId === template.id && "border-purple-600 ring-2 ring-purple-200"
          )}
        >
          <CardContent className="p-0">
            {/* Template Preview Image */}
            <div className="aspect-square bg-muted relative">
              {template.previewImage ? (
                <img
                  src={template.previewImage}
                  alt={template.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // If preview image fails to load, show fallback
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : null}

              {/* Fallback display */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30">
                <span className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {template.name.charAt(0)}
                </span>
                <span className="text-xs mt-1 text-purple-600/70 dark:text-purple-400/70">
                  {template.category}
                </span>
              </div>

              {/* Selection indicator */}
              {selectedTemplateId === template.id && (
                <div className="absolute inset-0 bg-purple-600/20 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center shadow-lg">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                </div>
              )}
            </div>

            {/* Template Name */}
            <div className="p-3 text-center border-t">
              <p className={cn(
                "text-sm font-medium truncate",
                selectedTemplateId === template.id && "text-purple-600"
              )}>
                {template.name}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {template.description}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
