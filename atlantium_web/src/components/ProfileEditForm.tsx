import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Camera } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { api } from "@/lib/api";
import { ProfileCard, type Profile } from "@/components/ProfileCard";

const profileEditSchema = z.object({
  first_name: z
    .string()
    .max(50, "First name must be 50 characters or less")
    .optional()
    .or(z.literal("")),
  last_name: z
    .string()
    .max(50, "Last name must be 50 characters or less")
    .optional()
    .or(z.literal("")),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be 30 characters or less")
    .regex(
      /^[a-zA-Z0-9_.]+$/,
      "Username can only contain letters, numbers, underscores, and periods"
    ),
  bio: z
    .string()
    .max(500, "Bio must be 500 characters or less")
    .optional()
    .or(z.literal("")),
  location: z
    .string()
    .max(100, "Location must be 100 characters or less")
    .optional()
    .or(z.literal("")),
  website_url: z
    .string()
    .url("Please enter a valid URL")
    .optional()
    .or(z.literal("")),
  linkedin_url: z
    .string()
    .url("Please enter a valid LinkedIn URL")
    .optional()
    .or(z.literal("")),
});

type ProfileEditFormValues = z.infer<typeof profileEditSchema>;

interface ProfileEditFormProps {
  profile?: Partial<Profile>;
  onSuccess?: (data: Record<string, unknown>) => void;
  variant?: "card" | "sheet";
  showPreview?: boolean;
  onAvatarClick?: () => void;
}

export function ProfileEditForm({ profile, onSuccess, variant = "card", showPreview = false, onAvatarClick }: ProfileEditFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(profile?.avatar_url);

  const form = useForm<ProfileEditFormValues>({
    resolver: zodResolver(profileEditSchema),
    defaultValues: {
      first_name: profile?.first_name ?? "",
      last_name: profile?.last_name ?? "",
      username: profile?.username ?? "",
      bio: profile?.bio ?? "",
      location: profile?.location ?? "",
      website_url: profile?.website_url ?? "",
      linkedin_url: profile?.linkedin_url ?? "",
    },
  });

  // Update form values when profile data is loaded
  useEffect(() => {
    if (profile) {
      form.reset({
        first_name: profile.first_name ?? "",
        last_name: profile.last_name ?? "",
        username: profile.username ?? "",
        bio: profile.bio ?? "",
        location: profile.location ?? "",
        website_url: profile.website_url ?? "",
        linkedin_url: profile.linkedin_url ?? "",
      });
      setAvatarUrl(profile.avatar_url);
    }
  }, [profile, form]);

  // Watch form values for live preview
  const watchedValues = form.watch();

  // Create a preview profile from watched values
  const fullName = [watchedValues.first_name, watchedValues.last_name].filter(Boolean).join(" ");
  const previewProfile: Profile = {
    id: profile?.id ?? "",
    user_id: profile?.user_id ?? "",
    username: watchedValues.username || profile?.username || "",
    display_name: fullName || profile?.display_name || watchedValues.username || "",
    first_name: watchedValues.first_name || undefined,
    last_name: watchedValues.last_name || undefined,
    bio: watchedValues.bio || undefined,
    avatar_url: avatarUrl,
    location: watchedValues.location || undefined,
    website_url: watchedValues.website_url || undefined,
    linkedin_url: watchedValues.linkedin_url || undefined,
    created_at: profile?.created_at,
    updated_at: profile?.updated_at,
  };

  const handleSubmit = async (values: ProfileEditFormValues) => {
    setIsLoading(true);

    try {
      // Clean up empty strings to null for optional fields
      // Display name is derived from first_name + last_name, or falls back to username
      const derivedDisplayName = [values.first_name, values.last_name].filter(Boolean).join(" ") || values.username;
      const cleanedData = {
        username: values.username,
        display_name: derivedDisplayName,
        first_name: values.first_name || null,
        last_name: values.last_name || null,
        bio: values.bio || null,
        location: values.location || null,
        website_url: values.website_url || null,
        linkedin_url: values.linkedin_url || null,
        avatar_url: avatarUrl ?? null,
      };

      const response = await api.updateProfile(cleanedData);
      toast.success("Profile updated successfully");
      onSuccess?.(response);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update profile";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const formContent = (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-6"
      >
        {showPreview && (
          <div className="mb-6">
            <ProfileCard
              profile={previewProfile}
              editable={true}
              onAvatarUpload={setAvatarUrl}
            />
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="first_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input placeholder="John" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="last_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                  <Input placeholder="Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input placeholder="johndoe" {...field} />
                </FormControl>
                <FormDescription>
                  Letters, numbers, underscores, periods.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {onAvatarClick && (
            <div className="space-y-2">
              <FormLabel>Update Avatar</FormLabel>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={onAvatarClick}
              >
                <Camera className="h-4 w-4 mr-2" />
                Change photo
              </Button>
            </div>
          )}
        </div>

        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Tell us about yourself..."
                  className="min-h-[100px] resize-none"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Brief description about yourself (max 500 characters).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl>
                <Input placeholder="San Francisco, CA" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="website_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Website</FormLabel>
              <FormControl>
                <Input
                  type="url"
                  placeholder="https://example.com"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="linkedin_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>LinkedIn</FormLabel>
              <FormControl>
                <Input
                  type="url"
                  placeholder="https://linkedin.com/in/username"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );

  if (variant === "sheet") {
    return formContent;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Profile</CardTitle>
        <CardDescription>
          Update your profile information visible to other users
        </CardDescription>
      </CardHeader>
      <CardContent>{formContent}</CardContent>
    </Card>
  );
}
