import type { Route } from "./+types/detail";
import { useTRPC } from "~/lib/trpc";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "~/components/ui/button";
import { Download, ArrowLeft, Edit, Trash } from "lucide-react";
import { useNavigate } from "react-router";
import { Badge } from "~/components/ui/badge";
import { prefetch } from "~/lib/prefetch";
import { useEffect, useRef, useState } from "react";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "~/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerDescription,
  DrawerFooter,
} from "~/components/ui/drawer";
import { useIsMobile } from "~/hooks/useSize";
import { toast } from "sonner";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "File Details - tana" },
    { name: "description", content: "View file details in tana" },
  ];
}

export const unstable_middleware: Route.unstable_MiddlewareFunction[] = [
  async ({ context, params }) => {
    const { queryClient, trpc } = prefetch(context);

    await queryClient.prefetchQuery(
      trpc.detail.getFile.queryOptions({
        id: parseInt(params.object),
      }),
    );
  },
];

export default function Detail({ params }: Route.ComponentProps) {
  const trpc = useTRPC();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [descriptionInput, setDescriptionInput] = useState("");
  const [tagInput, setTagInput] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const {
    data: fileDetails,
    isLoading,
    refetch,
  } = useQuery(
    trpc.detail.getFile.queryOptions({
      id: parseInt(params.object),
    }),
  );

  // Set form values when fileDetails or dialog changes
  useEffect(() => {
    if (fileDetails && isEditDialogOpen) {
      setNameInput(fileDetails.name);
      setDescriptionInput(fileDetails.description || "");
      setTagInput(fileDetails.tags?.join(", ") || "");
    }
  }, [fileDetails, isEditDialogOpen]);

  // Update file mutation
  const updateMutation = useMutation(
    trpc.detail.updateFile.mutationOptions({
      onSuccess: () => {
        toast.success("File updated successfully");
        setIsEditDialogOpen(false);
        refetch();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update file");
      },
    }),
  );

  // Delete file mutation
  const deleteMutation = useMutation(
    trpc.fileOps.delete.mutationOptions({
      onSuccess: () => {
        toast.success("File deleted successfully");
        navigate(-1);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete file");
      },
    }),
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Process tags from the tag input
    const tags = tagInput
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    updateMutation.mutate({
      id: fileDetails!.id,
      name: nameInput,
      description: descriptionInput,
      tags,
    });
  };

  const handleDeleteConfirm = () => {
    if (!fileDetails) return;

    deleteMutation.mutate({
      id: fileDetails.id,
    });
  };

  const isPreviewable =
    fileDetails?.mime?.startsWith("image/") ||
    fileDetails?.mime?.startsWith("video/");

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!fileDetails) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">File not found</div>
      </div>
    );
  }

  // Edit Form Content to be used in both Dialog and Drawer
  const EditFormContent = () => (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 py-2">
      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium">
          File Name
        </label>
        <Input
          id="name"
          name="name"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="description" className="text-sm font-medium">
          Description
        </label>
        <Textarea
          id="description"
          name="description"
          rows={3}
          value={descriptionInput}
          onChange={(e) => setDescriptionInput(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="tags" className="text-sm font-medium">
          Tags (comma separated)
        </label>
        <Input
          id="tags"
          name="tags"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          placeholder="tag1, tag2, tag3"
        />
      </div>

      <div className={isMobile ? "pb-4" : ""}>
        <Button
          type="button"
          variant="outline"
          className="mr-2"
          onClick={() => setIsEditDialogOpen(false)}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="size-5" />
        </Button>

        <h1 className="text-3xl font-bold">{fileDetails.name}</h1>

        <div className="flex-1" />

        {isMobile ? (
          <>
            <Drawer
              open={isEditDialogOpen}
              onOpenChange={(open) => {
                setIsEditDialogOpen(open);
                // Reset form state when drawer closes
                if (!open) {
                  setNameInput("");
                  setDescriptionInput("");
                  setTagInput("");
                }
              }}
            >
              <DrawerTrigger asChild>
                <Button variant="outline" size="icon">
                  <Edit className="size-4" />
                </Button>
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Edit File Details</DrawerTitle>
                  <DrawerDescription>
                    Edit the file details for {fileDetails.name}
                  </DrawerDescription>
                </DrawerHeader>
                <div className="px-4">
                  <EditFormContent />
                </div>
              </DrawerContent>
            </Drawer>

            <Button
              variant="outline"
              size="icon"
              className="text-destructive"
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <Trash className="size-4" />
            </Button>

            <Drawer
              open={isDeleteDialogOpen}
              onOpenChange={(open) => !open && setIsDeleteDialogOpen(false)}
            >
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Delete File</DrawerTitle>
                  <DrawerDescription asChild>
                    <div>
                      <p className="text-foreground text-base">
                        Are you sure you want to delete {fileDetails?.name}?
                      </p>
                      <p className="text-muted-foreground mt-2 text-sm">
                        This action cannot be undone.
                      </p>
                    </div>
                  </DrawerDescription>
                </DrawerHeader>
                <DrawerFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDeleteDialogOpen(false)}
                    disabled={deleteMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDeleteConfirm}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? "Deleting..." : "Delete"}
                  </Button>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          </>
        ) : (
          <>
            <Dialog
              open={isEditDialogOpen}
              onOpenChange={(open) => {
                setIsEditDialogOpen(open);
                // Reset form state when dialog closes
                if (!open) {
                  setNameInput("");
                  setDescriptionInput("");
                  setTagInput("");
                }
              }}
            >
              <DialogTrigger asChild>
                <Button variant="outline" size="icon">
                  <Edit className="size-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit File Details</DialogTitle>
                  <DialogDescription>
                    Edit the file details for {fileDetails.name}
                  </DialogDescription>
                </DialogHeader>
                <EditFormContent />
              </DialogContent>
            </Dialog>

            <Button
              variant="outline"
              size="icon"
              className="text-destructive"
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <Trash className="size-4" />
            </Button>

            <Dialog
              open={isDeleteDialogOpen}
              onOpenChange={(open) => !open && setIsDeleteDialogOpen(false)}
            >
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete File</DialogTitle>
                  <DialogDescription asChild>
                    <div>
                      <p className="text-foreground text-base">
                        Are you sure you want to delete {fileDetails?.name}?
                      </p>
                      <p className="text-muted-foreground mt-2 text-sm">
                        This action cannot be undone.
                      </p>
                    </div>
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDeleteDialogOpen(false)}
                    disabled={deleteMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDeleteConfirm}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? "Deleting..." : "Delete"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Preview Section */}
        <div className="rounded-lg p-4">
          {isPreviewable ? (
            <div className="overflow-hidden">
              {fileDetails.mime?.startsWith("image/") ? (
                <img
                  src={`/${fileDetails.name}`}
                  alt={fileDetails.name}
                  className="m-auto h-full max-h-[60dvh] rounded-lg object-contain"
                />
              ) : fileDetails.mime?.startsWith("video/") ? (
                <video src={`/${fileDetails.name}`} controls className="w-full">
                  Your browser does not support the video tag.
                </video>
              ) : null}
            </div>
          ) : (
            <div className="bg-muted/20 flex h-48 items-center justify-center rounded-lg">
              <p className="text-muted-foreground">No preview available</p>
            </div>
          )}
        </div>

        {/* Details Section */}
        <div className="rounded-lg p-4">
          <h2 className="mb-4 text-xl font-semibold">File Details</h2>

          <div className="space-y-4">
            <div>
              <h3 className="text-muted-foreground text-sm font-medium">
                Filename
              </h3>
              <p className="mt-1">{fileDetails.name}</p>
            </div>

            <div>
              <h3 className="text-muted-foreground text-sm font-medium">
                Description
              </h3>
              <p className="mt-1">
                {fileDetails.description ? (
                  fileDetails.description
                ) : (
                  <span className="text-muted-foreground text-sm italic">
                    No description provided
                  </span>
                )}
              </p>
            </div>

            <div>
              <h3 className="text-muted-foreground text-sm font-medium">
                Tags
              </h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {fileDetails.tags?.length ? (
                  fileDetails.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary">
                      {tag}
                    </Badge>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm italic">
                    No tags
                  </p>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-muted-foreground text-sm font-medium">
                File Type
              </h3>
              <p className="mt-1">{fileDetails.mime || "Unknown"}</p>
            </div>

            <div>
              <h3 className="text-muted-foreground text-sm font-medium">
                Uploaded
              </h3>
              <p className="mt-1">
                {new Date(fileDetails.created).toLocaleString()}
              </p>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                className="flex-1"
                onClick={() => {
                  const link = document.createElement("a");
                  link.href = `/${fileDetails.name}`;
                  link.download = fileDetails.name;
                  link.click();
                }}
              >
                <Download className="mr-2 size-4" />
                Download File
              </Button>
              <Button
                className="flex-1"
                variant="destructive"
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <Trash className="mr-2 size-4" />
                Delete File
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
