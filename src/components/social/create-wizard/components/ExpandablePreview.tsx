import PostPreview from './PostPreview';
import type { Platform } from '../types';

interface ExpandablePreviewProps {
  platform: Platform;
  imageUrl: string | null;
  caption: string;
  hashtags: string[];
}

export default function ExpandablePreview(props: ExpandablePreviewProps) {
  return (
    <div className="p-4 max-h-[80vh] overflow-y-auto">
      {/* Platform indicator */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {props.platform === 'facebook' && '📘 Facebook Preview'}
          {props.platform === 'instagram' && '📸 Instagram Preview'}
          {props.platform === 'linkedin' && '💼 LinkedIn Preview'}
        </span>
      </div>

      {/* Full preview - always expanded */}
      <PostPreview {...props} defaultExpanded={true} />

      {/* Caption character count */}
      <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-500 dark:text-gray-400">
        <span>
          {props.caption.length} characters
        </span>
        {props.hashtags.length > 0 && (
          <span>
            {props.hashtags.length} hashtags
          </span>
        )}
      </div>
    </div>
  );
}
