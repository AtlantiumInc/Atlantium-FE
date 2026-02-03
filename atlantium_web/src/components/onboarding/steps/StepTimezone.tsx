import { useState, useMemo, useEffect } from "react";
import { motion } from "motion/react";
import { MapPin, Check, Search, Navigation } from "lucide-react";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { Switch } from "../../ui/switch";
import type { OnboardingFormData } from "../../../lib/onboarding-schema";
import { TIMEZONE_OPTIONS, detectUserTimezone } from "../../../lib/onboarding-options";
import { cn } from "../../../lib/utils";

interface StepTimezoneProps {
  formData: Partial<OnboardingFormData>;
  errors: Record<string, string>;
  onUpdate: <K extends keyof OnboardingFormData>(
    field: K,
    value: OnboardingFormData[K]
  ) => void;
}

export function StepTimezone({ formData, errors, onUpdate }: StepTimezoneProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState("");

  // Auto-detect timezone on mount
  useEffect(() => {
    if (!formData.timezone) {
      const detected = detectUserTimezone();
      onUpdate("timezone", detected);
    }
  }, []);

  const filteredLocations = useMemo(() => {
    if (!search.trim()) return TIMEZONE_OPTIONS;
    const query = search.toLowerCase();
    return TIMEZONE_OPTIONS.filter(
      (tz) =>
        tz.label.toLowerCase().includes(query) ||
        tz.value.toLowerCase().includes(query)
    );
  }, [search]);

  const selectedLocation = TIMEZONE_OPTIONS.find(
    (tz) => tz.value === formData.timezone
  );

  // If we have a detected location and not showing picker, show confirmation
  if (selectedLocation && !showPicker) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">
            Select your location
          </h2>
          <p className="text-muted-foreground">
            We'll use this to show event times in your local time.
          </p>
        </div>

        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-4 p-4 rounded-xl bg-primary/5 border border-primary"
        >
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
            <Navigation className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-lg">{selectedLocation.label}</p>
            <p className="text-sm text-muted-foreground">
              Based on your browser settings
            </p>
          </div>
          <Check className="h-6 w-6 text-primary" />
        </motion.div>

        <Button
          type="button"
          variant="ghost"
          onClick={() => setShowPicker(true)}
          className="w-full"
        >
          <MapPin className="h-4 w-4 mr-2" />
          Not right? Choose a different location
        </Button>

        {/* Georgia Resident Toggle */}
        <button
          type="button"
          onClick={() =>
            onUpdate("is_georgia_resident" as keyof OnboardingFormData, !formData.is_georgia_resident)
          }
          className="w-full flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer text-left"
        >
          <div className="space-y-1">
            <span className="text-sm font-medium">I am a Georgia resident</span>
            <p className="text-xs text-muted-foreground">
              Eligible for special local events and programs.
            </p>
          </div>
          <Switch
            checked={formData.is_georgia_resident || false}
            onCheckedChange={(checked) =>
              onUpdate("is_georgia_resident" as keyof OnboardingFormData, checked)
            }
            onClick={(e) => e.stopPropagation()}
          />
        </button>

        {errors.timezone && (
          <p className="text-sm text-destructive">{errors.timezone}</p>
        )}
      </motion.div>
    );
  }

  // Show the location picker
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">
          Select your location
        </h2>
        <p className="text-muted-foreground">
          Search for your city or select from the list.
        </p>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="location-search"
            type="text"
            placeholder="Search cities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="max-h-[300px] overflow-y-auto rounded-lg border border-border">
          {filteredLocations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No locations found
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredLocations.map((tz) => {
                const isSelected = formData.timezone === tz.value;
                return (
                  <button
                    key={tz.value}
                    type="button"
                    onClick={() => {
                      onUpdate("timezone", tz.value);
                      setSearch("");
                      setShowPicker(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 text-left transition-colors",
                      "hover:bg-accent/50",
                      isSelected && "bg-primary/5"
                    )}
                  >
                    <MapPin className={cn(
                      "h-4 w-4 flex-shrink-0",
                      isSelected ? "text-primary" : "text-muted-foreground"
                    )} />
                    <span className={cn(
                      "flex-1",
                      isSelected && "font-medium"
                    )}>
                      {tz.label}
                    </span>
                    {isSelected && (
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {errors.timezone && (
          <p className="text-sm text-destructive">{errors.timezone}</p>
        )}
      </div>
    </motion.div>
  );
}
