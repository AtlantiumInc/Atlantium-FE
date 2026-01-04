import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Calendar, TrendingUp, Sparkles, ChevronRight } from "lucide-react";

interface DigestItem {
  icon: React.ReactNode;
  text: string;
}

export function DailyDigest() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const items: DigestItem[] = [
    { icon: <Calendar size={16} className="text-blue-500" />, text: "2 events today" },
    { icon: <TrendingUp size={16} className="text-green-500" />, text: "Learn SwiftUI - 60% complete" },
    { icon: <Sparkles size={16} className="text-amber-500" />, text: "5 new grant opportunities" },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-muted rounded-lg">
              <Calendar size={18} />
            </div>
            <div>
              <h3 className="font-semibold">Daily Digest</h3>
              <p className="text-sm text-muted-foreground">{today}</p>
            </div>
          </div>
          <ChevronRight size={20} className="text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-3 text-sm">
            {item.icon}
            <span>{item.text}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
