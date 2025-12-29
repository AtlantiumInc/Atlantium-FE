import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
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
import type { Profile } from "@/components/ProfileCard";

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
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores"
    ),
  display_name: z
    .string()
    .min(1, "Display name is required")
    .max(100, "Display name must be 100 characters or less"),
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
});

type ProfileEditFormValues = z.infer<typeof profileEditSchema>;

interface ProfileEditFormProps {
  profile?: Partial<Profile>;
  onSuccess?: (data: Record<string, unknown>) => void;
}

export function ProfileEditForm({ profile, onSuccess }: ProfileEditFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ProfileEditFormValues>({
    resolver: zodResolver(profileEditSchema),
    defaultValues: {
      first_name: profile?.first_name ?? "",
      last_name: profile?.last_name ?? "",
      username: profile?.username ?? "",
      display_name: profile?.display_name ?? "",
      bio: profile?.bio ?? "",
      location: profile?.location ?? "",
      website_url: profile?.website_url ?? "",
    },
  });

  const handleSubmit = async (values: ProfileEditFormValues) => {
    setIsLoading(true);

    try {
      // Clean up empty strings to undefined for optional fields
      const cleanedData = {
        ...values,
        first_name: values.first_name || undefined,
        last_name: values.last_name || undefined,
        bio: values.bio || undefined,
        location: values.location || undefined,
        website_url: values.website_url || undefined,
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Profile</CardTitle>
        <CardDescription>
          Update your profile information visible to other users
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
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
                    Your unique identifier. Only letters, numbers, and
                    underscores.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="display_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormDescription>
                    The name displayed on your profile and in conversations.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

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

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => form.reset()}
                disabled={isLoading}
              >
                Reset
              </Button>
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
      </CardContent>
    </Card>
  );
}
