import { useState } from 'react';
import { 
  Facebook, Instagram, Linkedin, Heart, MessageCircle, Share2, 
  Send, Bookmark, MoreHorizontal, ThumbsUp, Repeat2
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface SocialPostPreviewProps {
  captions: {
    facebook: string;
    instagram: string;
    linkedin: string;
  };
  image?: string;
  accountName?: string;
  accountAvatar?: string;
  className?: string;
}

export function SocialPostPreview({
  captions,
  image,
  accountName = 'Purple Homes',
  accountAvatar,
  className,
}: SocialPostPreviewProps) {
  const [activeTab, setActiveTab] = useState<'facebook' | 'instagram' | 'linkedin'>('facebook');

  return (
    <Card className={cn("overflow-hidden", className)}>
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="w-full grid grid-cols-3 rounded-none border-b">
          <TabsTrigger value="facebook" className="gap-2 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-blue-500">
            <Facebook className="h-4 w-4 text-blue-500" />
            <span className="hidden sm:inline">Facebook</span>
          </TabsTrigger>
          <TabsTrigger value="instagram" className="gap-2 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-pink-500">
            <Instagram className="h-4 w-4 text-pink-500" />
            <span className="hidden sm:inline">Instagram</span>
          </TabsTrigger>
          <TabsTrigger value="linkedin" className="gap-2 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-blue-700">
            <Linkedin className="h-4 w-4 text-blue-700" />
            <span className="hidden sm:inline">LinkedIn</span>
          </TabsTrigger>
        </TabsList>

        {/* Facebook Preview */}
        <TabsContent value="facebook" className="mt-0">
          <FacebookPreview 
            caption={captions.facebook}
            image={image}
            accountName={accountName}
            accountAvatar={accountAvatar}
          />
        </TabsContent>

        {/* Instagram Preview */}
        <TabsContent value="instagram" className="mt-0">
          <InstagramPreview 
            caption={captions.instagram}
            image={image}
            accountName={accountName}
            accountAvatar={accountAvatar}
          />
        </TabsContent>

        {/* LinkedIn Preview */}
        <TabsContent value="linkedin" className="mt-0">
          <LinkedInPreview 
            caption={captions.linkedin}
            image={image}
            accountName={accountName}
            accountAvatar={accountAvatar}
          />
        </TabsContent>
      </Tabs>
    </Card>
  );
}

// Facebook Post Preview
function FacebookPreview({ 
  caption, 
  image, 
  accountName, 
  accountAvatar 
}: { 
  caption: string; 
  image?: string; 
  accountName: string;
  accountAvatar?: string;
}) {
  return (
    <div className="bg-white dark:bg-zinc-900">
      {/* Header */}
      <div className="flex items-center gap-3 p-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={accountAvatar} />
          <AvatarFallback className="bg-blue-500 text-white">
            {accountName.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{accountName}</p>
          <p className="text-xs text-zinc-500">Just now · 🌎</p>
        </div>
        <MoreHorizontal className="h-5 w-5 text-zinc-400" />
      </div>

      {/* Caption */}
      <div className="px-3 pb-3">
        <p className="text-sm text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap">
          {caption || <span className="text-zinc-400 italic">No caption yet...</span>}
        </p>
      </div>

      {/* Image */}
      {image && (
        <div className="aspect-[4/3] bg-zinc-100 dark:bg-zinc-800">
          <img src={image} alt="Post" className="w-full h-full object-cover" />
        </div>
      )}

      {/* Engagement Stats */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center gap-1">
          <div className="flex -space-x-1">
            <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
              <ThumbsUp className="h-3 w-3 text-white fill-white" />
            </div>
            <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
              <Heart className="h-3 w-3 text-white fill-white" />
            </div>
          </div>
          <span className="text-xs text-zinc-500 ml-1">24</span>
        </div>
        <div className="flex gap-3 text-xs text-zinc-500">
          <span>3 comments</span>
          <span>2 shares</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-around py-1 border-b border-zinc-200 dark:border-zinc-700">
        <button className="flex items-center gap-2 px-4 py-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors">
          <ThumbsUp className="h-5 w-5" />
          <span className="text-sm font-medium">Like</span>
        </button>
        <button className="flex items-center gap-2 px-4 py-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors">
          <MessageCircle className="h-5 w-5" />
          <span className="text-sm font-medium">Comment</span>
        </button>
        <button className="flex items-center gap-2 px-4 py-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors">
          <Share2 className="h-5 w-5" />
          <span className="text-sm font-medium">Share</span>
        </button>
      </div>
    </div>
  );
}

// Instagram Post Preview
function InstagramPreview({ 
  caption, 
  image, 
  accountName, 
  accountAvatar 
}: { 
  caption: string; 
  image?: string; 
  accountName: string;
  accountAvatar?: string;
}) {
  return (
    <div className="bg-white dark:bg-black">
      {/* Header */}
      <div className="flex items-center gap-3 p-3">
        <div className="p-[2px] bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 rounded-full">
          <Avatar className="h-8 w-8 border-2 border-white dark:border-black">
            <AvatarImage src={accountAvatar} />
            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs">
              {accountName.charAt(0)}
            </AvatarFallback>
          </Avatar>
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{accountName.toLowerCase().replace(/\s/g, '')}</p>
        </div>
        <MoreHorizontal className="h-5 w-5 text-zinc-900 dark:text-zinc-100" />
      </div>

      {/* Image */}
      <div className="aspect-square bg-zinc-100 dark:bg-zinc-900">
        {image ? (
          <img src={image} alt="Post" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-400">
            <Instagram className="h-12 w-12" />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-4">
          <Heart className="h-6 w-6 text-zinc-900 dark:text-zinc-100 hover:text-zinc-500 cursor-pointer transition-colors" />
          <MessageCircle className="h-6 w-6 text-zinc-900 dark:text-zinc-100 hover:text-zinc-500 cursor-pointer transition-colors" />
          <Send className="h-6 w-6 text-zinc-900 dark:text-zinc-100 hover:text-zinc-500 cursor-pointer transition-colors" />
        </div>
        <Bookmark className="h-6 w-6 text-zinc-900 dark:text-zinc-100 hover:text-zinc-500 cursor-pointer transition-colors" />
      </div>

      {/* Likes */}
      <div className="px-3">
        <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">127 likes</p>
      </div>

      {/* Caption */}
      <div className="px-3 pb-3 pt-1">
        <p className="text-sm text-zinc-900 dark:text-zinc-100">
          <span className="font-semibold">{accountName.toLowerCase().replace(/\s/g, '')}</span>{' '}
          <span className="whitespace-pre-wrap">
            {caption || <span className="text-zinc-400 italic">No caption yet...</span>}
          </span>
        </p>
        <p className="text-xs text-zinc-400 mt-1 uppercase">2 hours ago</p>
      </div>
    </div>
  );
}

// LinkedIn Post Preview
function LinkedInPreview({ 
  caption, 
  image, 
  accountName, 
  accountAvatar 
}: { 
  caption: string; 
  image?: string; 
  accountName: string;
  accountAvatar?: string;
}) {
  return (
    <div className="bg-white dark:bg-zinc-900">
      {/* Header */}
      <div className="flex items-start gap-3 p-3">
        <Avatar className="h-12 w-12">
          <AvatarImage src={accountAvatar} />
          <AvatarFallback className="bg-blue-700 text-white">
            {accountName.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{accountName}</p>
          <p className="text-xs text-zinc-500">Real Estate Professional</p>
          <p className="text-xs text-zinc-400">2h · 🌐</p>
        </div>
        <MoreHorizontal className="h-5 w-5 text-zinc-400" />
      </div>

      {/* Caption */}
      <div className="px-3 pb-3">
        <p className="text-sm text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap leading-relaxed">
          {caption || <span className="text-zinc-400 italic">No caption yet...</span>}
        </p>
      </div>

      {/* Image */}
      {image && (
        <div className="aspect-[1.91/1] bg-zinc-100 dark:bg-zinc-800">
          <img src={image} alt="Post" className="w-full h-full object-cover" />
        </div>
      )}

      {/* Engagement Stats */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center gap-1">
          <div className="flex -space-x-1">
            <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center">
              <ThumbsUp className="h-2.5 w-2.5 text-white fill-white" />
            </div>
            <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
              <span className="text-[8px]">👏</span>
            </div>
            <div className="w-4 h-4 rounded-full bg-red-400 flex items-center justify-center">
              <Heart className="h-2.5 w-2.5 text-white fill-white" />
            </div>
          </div>
          <span className="text-xs text-zinc-500 ml-1">42</span>
        </div>
        <span className="text-xs text-zinc-500">8 comments · 3 reposts</span>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-around py-1">
        <button className="flex items-center gap-2 px-3 py-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors">
          <ThumbsUp className="h-5 w-5" />
          <span className="text-xs font-medium">Like</span>
        </button>
        <button className="flex items-center gap-2 px-3 py-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors">
          <MessageCircle className="h-5 w-5" />
          <span className="text-xs font-medium">Comment</span>
        </button>
        <button className="flex items-center gap-2 px-3 py-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors">
          <Repeat2 className="h-5 w-5" />
          <span className="text-xs font-medium">Repost</span>
        </button>
        <button className="flex items-center gap-2 px-3 py-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors">
          <Send className="h-5 w-5" />
          <span className="text-xs font-medium">Send</span>
        </button>
      </div>
    </div>
  );
}