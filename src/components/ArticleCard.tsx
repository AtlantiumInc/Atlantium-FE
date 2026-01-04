import { Bookmark, Share2, Sparkles, Cpu, Brain } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Article } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";

interface ArticleCardProps {
  article: Article;
  onReadMore?: (article: Article) => void;
  onBookmark?: (article: Article) => void;
  onShare?: (article: Article) => void;
}

// Map source icons to Lucide components
const sourceIcons: Record<string, React.ReactNode> = {
  sparkles: <Sparkles className="h-4 w-4" />,
  cpu: <Cpu className="h-4 w-4" />,
  brain: <Brain className="h-4 w-4" />,
};

export function ArticleCard({ article, onReadMore, onBookmark, onShare }: ArticleCardProps) {
  const timeAgo = formatDistanceToNow(new Date(article.created_at), { addSuffix: true });
  const SourceIcon = sourceIcons[article.source.icon] || <Sparkles className="h-4 w-4" />;

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        {/* Header: Source and Time */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="text-primary">{SourceIcon}</span>
            <span className="text-sm font-medium">{article.source.name}</span>
          </div>
          <span className="text-xs text-muted-foreground">{timeAgo}</span>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-lg leading-tight mb-2 line-clamp-2">
          {article.title}
        </h3>

        {/* Summary */}
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {article.summary}
        </p>

        {/* Tags */}
        {article.tags && article.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {article.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs font-normal">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          <Button
            variant="link"
            className="text-primary p-0 h-auto font-medium"
            onClick={() => onReadMore?.(article)}
          >
            Read More
          </Button>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onBookmark?.(article)}
            >
              <Bookmark
                className={`h-4 w-4 ${article.is_bookmarked ? "fill-current" : ""}`}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onShare?.(article)}
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
