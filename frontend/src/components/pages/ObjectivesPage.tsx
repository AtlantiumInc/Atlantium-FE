import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target, Plus, CheckCircle2, Circle, TrendingUp } from "lucide-react";

interface Objective {
  id: string;
  title: string;
  progress: number;
  completed: boolean;
}

const DEMO_OBJECTIVES: Objective[] = [
  { id: "1", title: "Learn SwiftUI", progress: 60, completed: false },
  { id: "2", title: "Ship MVP by Q1", progress: 35, completed: false },
  { id: "3", title: "Read 12 books this year", progress: 25, completed: false },
  { id: "4", title: "Complete TypeScript course", progress: 100, completed: true },
];

export function ObjectivesPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 rounded-lg">
            <Target className="h-6 w-6 text-amber-500" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Objectives</h2>
            <p className="text-sm text-muted-foreground">Track your goals and progress</p>
          </div>
        </div>
        <Button size="sm">
          <Plus size={16} className="mr-1" />
          New Objective
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">4</div>
            <p className="text-sm text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-500">1</div>
            <p className="text-sm text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-amber-500">3</div>
            <p className="text-sm text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
      </div>

      {/* Objectives List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your Objectives</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {DEMO_OBJECTIVES.map((objective) => (
            <div key={objective.id} className="flex items-center gap-3">
              {objective.completed ? (
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className={objective.completed ? "line-through text-muted-foreground" : ""}>
                  {objective.title}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${objective.progress}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{objective.progress}%</span>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
