import { useTRPC } from "~/lib/trpc";
import type { Route } from "./+types/upload";
import { useState, useRef } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { useMutation, useQuery, skipToken } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { cn } from "~/lib/utils";
import { X } from "lucide-react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Upload - tana" },
    { name: "description", content: "Upload images to tana" },
  ];
}

export default function Upload() {
  const trpc = useTRPC();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [fileName, setFileName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Check if file is previewable
  const isPreviewable =
    selectedFile &&
    (selectedFile.type.startsWith("image/") ||
      selectedFile.type.startsWith("video/")) &&
    selectedFile.size <= 50 * 1024 * 1024; // Skip files over 50MB

  // Preview URL query with proper skipToken implementation
  const previewQuery = useQuery({
    queryKey: ["filePreview", selectedFile?.name],
    queryFn:
      isPreviewable && selectedFile
        ? async () => {
            return new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                resolve(reader.result as string);
              };
              reader.readAsDataURL(selectedFile);
            });
          }
        : skipToken,
  });

  // Upload mutation
  const { mutate, isPending, isError, error } = useMutation(
    trpc.upload.mutationOptions({
      onSuccess: (data) => {
        console.log("Upload successful:", data);
        navigate("/"); // Navigate to the gallery after successful upload
      },
      onError: (error) => {
        console.error("Upload failed:", error);
      },
      trpc: {
        context: {
          skipBatch: true,
        },
      },
    }),
  );

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setFileName(file.name);
    }
  };

  // Clear file selection
  const clearFileSelection = () => {
    setSelectedFile(null);
    setFileName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle drag events
  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Handle drop event
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setFileName(file.name);
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      alert("Please select a file to upload");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    if (fileName) {
      formData.append("name", fileName);
    }

    if (description) {
      formData.append("description", description);
    }

    // Parse tags from comma-separated string
    const tagList = tags
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    // Add each tag as a separate entry in the array
    tagList.forEach((tag) => {
      formData.append("tags", tag);
    });

    // Use the mutation
    mutate(formData);
  };

  return (
    <div className="px-4">
      <div>
        <div className="m-auto max-w-[1200px] p-4">
          <div className="mt-4 mb-8">
            <h1 className="text-3xl font-bold">Upload New Media</h1>
            <p className="text-muted-foreground mt-2">
              Upload images and videos to your gallery
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-6 lg:grid lg:grid-cols-2 lg:gap-8 lg:space-y-0"
          >
            {/* Drag & Drop / File Selection Area */}
            <div className="lg:flex lg:min-h-[400px] lg:flex-col lg:justify-center">
              <div
                className={cn(
                  "relative flex h-full cursor-pointer flex-col justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors",
                  dragActive
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/30 hover:border-primary/50",
                  selectedFile ? "bg-muted/20" : "",
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*,video/*"
                />

                {selectedFile && (
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground bg-background/80 hover:bg-background absolute top-2 right-2 rounded-full p-1 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearFileSelection();
                    }}
                  >
                    <X className="size-5" />
                  </button>
                )}

                {previewQuery.data ? (
                  <div className="flex flex-col items-center">
                    {selectedFile?.type.startsWith("image/") ? (
                      <img
                        src={previewQuery.data}
                        alt="Preview"
                        className="z-20 mb-4 max-h-[300px] rounded object-contain lg:max-h-[400px]"
                      />
                    ) : selectedFile?.type.startsWith("video/") ? (
                      <video
                        src={previewQuery.data}
                        controls
                        className="z-20 mb-4 max-h-[300px] rounded object-contain lg:max-h-[400px]"
                      />
                    ) : null}
                    <p className="text-sm">{selectedFile?.name}</p>
                    <p className="text-muted-foreground text-sm">
                      {selectedFile?.type} -{" "}
                      {selectedFile &&
                        (selectedFile.size / 1024 / 1024).toFixed(2)}{" "}
                      MB
                    </p>
                  </div>
                ) : selectedFile ? (
                  <div className="py-8">
                    {isPreviewable && previewQuery.isLoading ? (
                      <p className="text-muted-foreground">
                        Loading preview...
                      </p>
                    ) : (
                      <>
                        <p className="text-lg font-medium">
                          {selectedFile.name}
                        </p>
                        <p className="text-muted-foreground text-sm">
                          {selectedFile.type} -{" "}
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center py-12 lg:py-24">
                    <p className="text-lg font-medium">
                      Drag and drop your file here
                    </p>
                    <p className="text-muted-foreground mt-1 text-sm">
                      or click to browse
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Form Fields Container */}
            <div className="space-y-6 lg:pl-4">
              {/* Filename */}
              <div className="space-y-2">
                <label htmlFor="filename" className="text-sm font-medium">
                  File Name (optional)
                </label>
                <Input
                  id="filename"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder="Enter a custom filename or leave blank for auto-generated name"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label htmlFor="description" className="text-sm font-medium">
                  Description (optional)
                </label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a description for this file"
                  rows={3}
                />
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <label htmlFor="tags" className="text-sm font-medium">
                  Tags (optional, comma-separated)
                </label>
                <Input
                  id="tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="landscape, nature, vacation"
                />
                <p className="text-muted-foreground text-xs">
                  Separate tags with commas
                </p>
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={!selectedFile || isPending}
                >
                  {isPending ? "Uploading..." : "Upload File"}
                </Button>
              </div>

              {/* Error message */}
              {isError && (
                <div className="mt-2 text-sm text-red-500">
                  Upload failed:{" "}
                  {error instanceof Error
                    ? error.message
                    : error && typeof error === "object" && "message" in error
                      ? String(error.message)
                      : "Unknown error"}
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
