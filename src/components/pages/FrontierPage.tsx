import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FrontierFeed } from "@/components/FrontierFeed";
import { Compass } from "lucide-react";

export function FrontierPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Compass className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Frontier</h2>
          <p className="text-sm text-muted-foreground">Stay ahead with the latest in tech and AI</p>
        </div>
      </div>

      {/* All Articles */}
      <FrontierFeed limit={10} />

      {/* Trending Topics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Trending Topics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {["AI Models", "LLMs", "Agents", "Research", "Coding", "Startups"].map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-muted rounded-full text-sm cursor-pointer hover:bg-muted/80"
              >
                {tag}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
