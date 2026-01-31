import { useRef, useState } from "react";
import { motion } from "motion/react";
import { Camera, User, Loader2, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { api } from "../../lib/api";
import { toast } from "sonner";

interface AvatarUploadProps {
  currentUrl?: string;
  fallbackUrl?: string;
  initials?: string;
  onUpload: (url: string) => void;
  onRemove?: () => void;
}

export function AvatarUpload({
  currentUrl,
  fallbackUrl,
  initials = "",
  onUpload,
  onRemove,
}: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayUrl = currentUrl || fallbackUrl;
  const showRemove = currentUrl && currentUrl !== fallbackUrl && onRemove;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setIsUploading(true);

    try {
      // Upload to Xano file storage
      const response = await api.uploadFile(file);
      if (response?.url) {
        onUpload(response.url);
        toast.success("Avatar uploaded");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image");
    } finally {
      setIsUploading(false);
      // Reset input so same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemove = () => {
    if (onRemove) {
      onRemove();
      // If we have a fallback (Google avatar), use that instead
      if (fallbackUrl) {
        onUpload(fallbackUrl);
      }
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <motion.div
        className="relative"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Avatar className="h-32 w-32 cursor-pointer" onClick={handleClick}>
          <AvatarImage src={displayUrl} alt="Profile avatar" />
          <AvatarFallback className="text-2xl">
            {initials || <User className="h-12 w-12" />}
          </AvatarFallback>
        </Avatar>

        {/* Upload overlay */}
        <button
          type="button"
          onClick={handleClick}
          disabled={isUploading}
          className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 hover:opacity-100 transition-opacity"
        >
          {isUploading ? (
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          ) : (
            <Camera className="h-8 w-8 text-white" />
          )}
        </button>

        {/* Remove button */}
        {showRemove && (
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-1 -right-1 p-1 rounded-full bg-destructive text-destructive-foreground shadow-md hover:bg-destructive/90"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </motion.div>

      <div className="text-center">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClick}
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Camera className="h-4 w-4 mr-2" />
              {displayUrl ? "Change photo" : "Upload photo"}
            </>
          )}
        </Button>

        {fallbackUrl && !currentUrl && (
          <p className="text-xs text-muted-foreground mt-2">
            Using your Google profile photo
          </p>
        )}
      </div>
    </div>
  );
}
