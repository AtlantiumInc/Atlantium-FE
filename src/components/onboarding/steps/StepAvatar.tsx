import { useRef, useState } from "react";
import { motion } from "motion/react";
import { User, Check, Camera, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../../ui/avatar";
import { Button } from "../../ui/button";
import { toast } from "sonner";
import { api } from "../../../lib/api";
import type { OnboardingFormData } from "../../../lib/onboarding-schema";

interface StepAvatarProps {
  formData: Partial<OnboardingFormData>;
  errors: Record<string, string>;
  googleAvatarUrl?: string;
  onUpdate: <K extends keyof OnboardingFormData>(
    field: K,
    value: OnboardingFormData[K]
  ) => void;
}

export function StepAvatar({
  formData,
  googleAvatarUrl,
  onUpdate,
}: StepAvatarProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initials = [formData.first_name?.[0], formData.last_name?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase();

  const displayUrl = formData.avatar_url || googleAvatarUrl;
  const hasAvatar = !!displayUrl;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setIsUploading(true);
    try {
      const result = await api.uploadImage(file);
      if (result.url) {
        onUpdate("avatar_url", result.url);
        toast.success("Photo uploaded");
      } else {
        throw new Error("No URL returned from upload");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleUseGoogleAvatar = () => {
    if (googleAvatarUrl) {
      onUpdate("avatar_url", googleAvatarUrl);
    }
  };

  const handleSkip = () => {
    onUpdate("avatar_url", "");
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold tracking-tight">
          Your profile photo
        </h2>
        <p className="text-muted-foreground">
          Help other members recognize you.
        </p>
      </div>

      <div className="flex flex-col items-center py-6 space-y-6">
        <motion.div
          className="relative"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Avatar className="h-32 w-32">
            <AvatarImage src={displayUrl} alt="Profile avatar" />
            <AvatarFallback className="text-2xl">
              {initials || <User className="h-12 w-12" />}
            </AvatarFallback>
          </Avatar>

          {/* Upload overlay */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
          >
            {isUploading ? (
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            ) : (
              <Camera className="h-8 w-8 text-white" />
            )}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </motion.div>

        {hasAvatar ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-sm text-muted-foreground"
          >
            <Check className="h-4 w-4 text-primary" />
            <span>
              {formData.avatar_url === googleAvatarUrl
                ? "Using your Google photo"
                : "Photo set"}
            </span>
          </motion.div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No photo set - using your initials
          </p>
        )}

        <div className="flex flex-col gap-2 w-full max-w-xs">
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Camera className="h-4 w-4 mr-2" />
                {hasAvatar ? "Change photo" : "Upload photo"}
              </>
            )}
          </Button>

          {googleAvatarUrl && formData.avatar_url !== googleAvatarUrl && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleUseGoogleAvatar}
              className="w-full"
            >
              Use my Google photo
            </Button>
          )}

          {hasAvatar && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleSkip}
              className="w-full"
            >
              Use initials instead
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
