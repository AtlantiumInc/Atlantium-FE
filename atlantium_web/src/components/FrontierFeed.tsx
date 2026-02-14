import { useQuery } from "@tanstack/react-query";
import { Loader2, Newspaper, Bookmark, Share2, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { api, type FrontierArticle } from "@/lib/api";
import { toast } from "sonner";
import { useState } from "react";

interface FrontierFeedProps {
  limit?: number;
}

function FrontierArticleCard({ article }: { article: FrontierArticle }) {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const { content } = article;

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: content.title,
        text: content.tldr?.[0] || content.body.slice(0, 150),
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard");
    }
  };

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked);
    toast.success(isBookmarked ? "Bookmark removed" : "Article bookmarked");
  };

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      {/* Featured Image */}
      {content.featured_image?.url && (
        <div className="relative h-48 overflow-hidden">
          <img
            src={content.featured_image.url}
            alt={content.featured_image.alt || content.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}

      <CardContent className="p-4">
        {/* Publisher and Time */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {content.publisher?.logo_url && (
              <Avatar className="h-5 w-5">
                <AvatarImage src={content.publisher.logo_url} alt={content.publisher.name} />
                <AvatarFallback className="text-[10px]">
                  {content.publisher.name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
            )}
            <span className="text-sm font-medium text-muted-foreground">
              {content.publisher?.name}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            {content.publisher?.published_at}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-lg leading-tight mb-2 line-clamp-2">
          {content.title}
        </h3>

        {/* TLDR / Key Points */}
        {content.tldr && content.tldr.length > 0 && (
          <ul className="text-sm text-muted-foreground mb-3 space-y-1">
            {content.tldr.slice(0, 2).map((point, index) => (
              <li key={index} className="line-clamp-1 flex items-start gap-2">
                <span className="text-primary mt-1.5 flex-shrink-0 w-1 h-1 rounded-full bg-primary" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Author */}
        {content.author?.name && (
          <div className="flex items-center gap-2 mb-3">
            {content.author.avatar_url && (
              <Avatar className="h-6 w-6">
                <AvatarImage src={content.author.avatar_url} alt={content.author.name} />
                <AvatarFallback className="text-[10px]">
                  {content.author.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
            )}
            <span className="text-sm text-muted-foreground">
              By {content.author.name}
            </span>
          </div>
        )}

        {/* Tags */}
        {content.tags && content.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {content.tags.slice(0, 4).map((tag) => (
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
            className="text-primary p-0 h-auto font-medium flex items-center gap-1"
            onClick={() => toast.info("Article detail view coming soon")}
          >
            Read More
            <ExternalLink className="h-3 w-3" />
          </Button>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleBookmark}
            >
              <Bookmark
                className={`h-4 w-4 ${isBookmarked ? "fill-current" : ""}`}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleShare}
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function FrontierFeed({ limit = 10 }: FrontierFeedProps) {
  const { data: articles, isLoading, error } = useQuery({
    queryKey: ["frontierArticles"],
    queryFn: async () => {
      const data = await api.getFrontierArticles();
      return data.filter(a => a.content != null);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Newspaper className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>Failed to load articles</p>
      </div>
    );
  }

  if (!articles || articles.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Newspaper className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No articles yet</p>
      </div>
    );
  }

  const displayArticles = articles.slice(0, limit);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-primary">The Latest</h2>
        {articles.length > limit && (
          <button className="text-sm text-muted-foreground hover:text-foreground">
            View all
          </button>
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {displayArticles.map((article) => (
          <FrontierArticleCard key={article.id} article={article} />
        ))}
      </div>
    </div>
  );
}
