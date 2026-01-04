import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Newspaper } from "lucide-react";
import { ArticleCard } from "./ArticleCard";
import { api } from "@/lib/api";
import type { Article } from "@/lib/types";
import { toast } from "sonner";

// Demo articles for testing until backend is populated
const DEMO_ARTICLES: Article[] = [
  {
    id: "demo-1",
    thread_id: "frontier-1",
    title: "Claude 3.5 Sonnet Now Available with Enhanced Coding Capabilities",
    summary: "The latest update brings improved code generation, better understanding of complex codebases, and faster response times for dev...",
    source: { name: "Anthropic", icon: "sparkles" },
    tags: ["Claude", "AI Models", "Coding"],
    read_time_minutes: 4,
    is_bookmarked: false,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
  },
  {
    id: "demo-2",
    thread_id: "frontier-1",
    title: "GPT-5 Research Preview: What We Know So Far",
    summary: "Early reports suggest significant improvements in reasoning, multimodal understanding, and reduced hallucinations in the upcoming model.",
    content: `OpenAI's next-generation model, tentatively referred to as GPT-5, has been the subject of intense speculation following recent research papers and insider reports.

According to sources familiar with the development, the new model shows remarkable improvements in logical reasoning tasks, scoring significantly higher on benchmarks that have traditionally been challenging for large language models.

Perhaps most notably, early testing suggests a substantial reduction in hallucinations – the tendency for AI models to generate plausible but incorrect information.

The multimodal capabilities are also reportedly enhanced, with better integration between text, image, and potentially audio understanding.`,
    source: { name: "OpenAI", icon: "sparkles" },
    author: { name: "Michael Torres", title: "OpenAI" },
    tags: ["GPT-5", "Research", "LLMs"],
    key_takeaways: [
      "Significant improvements in logical reasoning",
      "Reduced hallucination rates",
      "Enhanced multimodal capabilities",
      "Expected release in late 2025"
    ],
    read_time_minutes: 5,
    is_bookmarked: false,
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
  },
  {
    id: "demo-3",
    thread_id: "frontier-1",
    title: "Gemini 2.0 Introduces Revolutionary Agentic Capabilities",
    summary: "The new Gemini release focuses on autonomous task completion and improved reasoning chains for complex multi-step problems.",
    source: { name: "Google DeepMind", icon: "brain" },
    tags: ["Gemini", "Agents", "Google"],
    read_time_minutes: 6,
    is_bookmarked: true,
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
  },
];

interface LatestArticlesProps {
  limit?: number;
  useDemoData?: boolean;
}

export function LatestArticles({ limit = 3, useDemoData = true }: LatestArticlesProps) {
  const [articles, setArticles] = useState<Article[]>(useDemoData ? DEMO_ARTICLES.slice(0, limit) : []);

  // Fetch real articles from API when not using demo data
  const { isLoading, error, data } = useQuery({
    queryKey: ["latestArticles", limit],
    queryFn: () => api.getLatestArticles(limit),
    enabled: !useDemoData,
  });

  // Update articles when data is fetched
  useEffect(() => {
    if (data && data.length > 0 && !useDemoData) {
      setArticles(data);
    }
  }, [data, useDemoData]);

  const handleReadMore = (article: Article) => {
    toast.info(`Opening: ${article.title}`);
    // TODO: Navigate to article detail page or open modal
  };

  const handleBookmark = async (article: Article) => {
    const newBookmarkState = !article.is_bookmarked;

    // Optimistically update UI
    setArticles((prev) =>
      prev.map((a) =>
        a.id === article.id ? { ...a, is_bookmarked: newBookmarkState } : a
      )
    );

    if (!useDemoData) {
      try {
        await api.bookmarkArticle(article.id, newBookmarkState);
        toast.success(newBookmarkState ? "Article bookmarked" : "Bookmark removed");
      } catch {
        // Revert on error
        setArticles((prev) =>
          prev.map((a) =>
            a.id === article.id ? { ...a, is_bookmarked: !newBookmarkState } : a
          )
        );
        toast.error("Failed to update bookmark");
      }
    } else {
      toast.success(newBookmarkState ? "Article bookmarked" : "Bookmark removed");
    }
  };

  const handleShare = (article: Article) => {
    if (navigator.share) {
      navigator.share({
        title: article.title,
        text: article.summary,
        url: article.external_url || window.location.href,
      });
    } else {
      navigator.clipboard.writeText(article.external_url || window.location.href);
      toast.success("Link copied to clipboard");
    }
  };

  if (isLoading && !useDemoData) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !useDemoData) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Failed to load articles</p>
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Newspaper className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No articles yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-red-500">The Latest</h2>
        <button className="text-sm text-muted-foreground hover:text-foreground">View all</button>
      </div>
      <div className="space-y-3">
        {articles.map((article) => (
          <ArticleCard
            key={article.id}
            article={article}
            onReadMore={handleReadMore}
            onBookmark={handleBookmark}
            onShare={handleShare}
          />
        ))}
      </div>
    </div>
  );
}
