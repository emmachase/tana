import type { Route } from "./+types/list";
import { useTRPC } from "~/lib/trpc";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { prefetch } from "~/lib/prefetch";
import { useState, useEffect } from "react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Download,
  Trash,
  Pencil,
  Search,
  Menu,
  FileIcon,
  Video,
  Image,
} from "lucide-react";
import { useDebounce } from "~/hooks/useDebounce";
import { useIsMobile } from "~/hooks/useSize";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "~/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerDescription,
} from "~/components/ui/drawer";
import { toast } from "sonner";

const LOAD_BATCH_SIZE = 50;

export function meta({}: Route.MetaArgs) {
  return [
    { title: "File List - tana" },
    { name: "description", content: "File management for tana!" },
  ];
}

export const unstable_middleware: Route.unstable_MiddlewareFunction[] = [
  async ({ context }) => {
    const { queryClient, trpc } = prefetch(context);

    const { initialCursor } = await queryClient.fetchQuery(
      trpc.list.init.queryOptions({
        name: "",
      }),
    );

    // Block the page to prefetch
    await queryClient.prefetchInfiniteQuery(
      trpc.list.getPage.infiniteQueryOptions({
        name: "",
        limit: LOAD_BATCH_SIZE,
        cursor: initialCursor,
      }),
    );
  },
];

// function formatFileSize(sizeInBytes: number): string {
//   if (sizeInBytes === 0) return "0 B";
//
//   const units = ["B", "KB", "MB", "GB", "TB"];
//   const digitGroups = Math.floor(Math.log10(sizeInBytes) / Math.log10(1024));
//
//   return `${(sizeInBytes / Math.pow(1024, digitGroups)).toFixed(2)} ${units[digitGroups]}`;
// }

function formatDate(dateStr: string | number): string {
  const date = new Date(dateStr);
  return date.toLocaleString();
}

export default function List() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [inputQuery, setInputQuery] = useState("");
  const searchQuery = useDebounce(inputQuery, 200);
  const [renameDialog, setRenameDialog] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [fileDetailsDrawer, setFileDetailsDrawer] = useState<{
    id: number;
    name: string;
    mime: string;
    created: string;
    description?: string;
  } | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const isMobile = useIsMobile();
  const [lastSuccessfulData, setLastSuccessfulData] = useState<typeof flatData>(
    [],
  );
  const [brokenImages, setBrokenImages] = useState<Set<number>>(new Set());

  // Fetch file data
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isFetching } =
    useInfiniteQuery(
      trpc.list.getPage.infiniteQueryOptions(
        {
          name: searchQuery,
          limit: LOAD_BATCH_SIZE,
        },
        {
          getNextPageParam: (lastPage) => {
            return lastPage.nextCursor;
          },
        },
      ),
    );

  const flatData = data?.pages.flatMap((page) => page.items) ?? [];

  // Update lastSuccessfulData when we get new non-loading data
  useEffect(() => {
    if (!isFetching) {
      setLastSuccessfulData(flatData);
    }
  }, [flatData, isFetching]);

  // Use lastSuccessfulData during loading, otherwise use current data
  const displayData = isFetching ? lastSuccessfulData : flatData;

  // Delete mutation
  const deleteMutation = useMutation(
    trpc.fileOps.delete.mutationOptions({
      onSuccess: () => {
        toast.success("File deleted successfully");
        queryClient.invalidateQueries({ queryKey: trpc.list.pathKey() });
      },
      onError: (error) => {
        console.error("Error deleting file:", error);
        toast.error("Failed to delete file");
      },
    }),
  );

  // Rename mutation
  const renameMutation = useMutation(
    trpc.fileOps.rename.mutationOptions({
      onSuccess: () => {
        toast.success("File renamed successfully");
        queryClient.invalidateQueries({ queryKey: trpc.list.pathKey() });
        setRenameDialog(null);
      },
      onError: (error) => {
        console.error("Error renaming file:", error);
        toast.error("Failed to rename file");
      },
    }),
  );

  // Action handlers
  const handleDelete = async (id: number, name: string) => {
    setDeleteDialog({ id, name });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog) return;
    deleteMutation.mutate({ id: deleteDialog.id });
    setDeleteDialog(null);
  };

  const handleRename = (id: number, name: string) => {
    setRenameDialog({ id, name });
    setRenameValue(name);
  };

  const handleRenameSubmit = async () => {
    if (!renameDialog) return;
    renameMutation.mutate({
      id: renameDialog.id,
      newName: renameValue,
    });
  };

  const handleDownload = (name: string) => {
    const link = document.createElement("a");
    link.href = `/${name}`;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenFile = (name: string) => {
    window.open(`/${name}`, "_blank");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <div className="px-4">
      <div>
        <div className="m-auto max-w-[1200px] p-4">
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="mb-6 flex gap-2">
            <Input
              type="text"
              placeholder="Search files..."
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" variant="default">
              <Search className="mr-2 h-4 w-4" />
              Search
            </Button>
          </form>

          {/* Files Table */}
          <div className="relative overflow-x-auto rounded-lg border shadow-sm">
            <table className="divide-border w-full divide-y">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-muted-foreground w-12 px-6 py-3 text-left text-xs font-medium tracking-wider uppercase">
                    {/* No text for "Preview" column */}
                  </th>
                  <th className="text-muted-foreground w-full py-3 pr-6 text-left text-xs font-medium tracking-wider uppercase">
                    Name
                  </th>
                  <th className="text-muted-foreground hidden max-w-[200px] px-6 py-3 text-left text-xs font-medium tracking-wider uppercase lg:table-cell">
                    Type
                  </th>
                  <th className="text-muted-foreground hidden px-6 py-3 text-left text-xs font-medium tracking-wider uppercase lg:table-cell">
                    Date
                  </th>
                  <th className="text-muted-foreground hidden min-w-[144px] px-6 py-3 text-right text-xs font-medium tracking-wider uppercase lg:table-cell">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-background divide-border divide-y">
                {displayData.length > 0 ? (
                  <>
                    {displayData.map((file) => (
                      <tr
                        key={file.id}
                        className={cn(
                          "hover:bg-muted/50 transition-colors",
                          isFetching && "opacity-50",
                        )}
                      >
                        <td className="w-12 px-6 py-4">
                          <div className="relative h-12 w-12">
                            {file.mime.startsWith("image/") ? (
                              brokenImages.has(file.id) ? (
                                <div className="flex h-full w-full items-center justify-center">
                                  <Image className="text-muted-foreground h-8 w-8" />
                                </div>
                              ) : (
                                <img
                                  src={`/${file.name}?size=48`}
                                  alt={file.name}
                                  className="h-full w-full rounded object-contain"
                                  onError={() => {
                                    setBrokenImages((prev) =>
                                      new Set(prev).add(file.id),
                                    );
                                  }}
                                />
                              )
                            ) : file.mime.startsWith("video/") ? (
                              <div className="flex h-full w-full items-center justify-center">
                                <Video className="text-muted-foreground h-8 w-8" />
                              </div>
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <FileIcon className="text-muted-foreground h-8 w-8" />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="w-full py-4 pr-6">
                          <div className="flex items-center gap-2">
                            <div className="min-w-0 flex-1 overflow-hidden">
                              <a
                                href={`/${file.name}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary block cursor-pointer overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap hover:underline"
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleOpenFile(file.name);
                                }}
                                title={file.name}
                              >
                                {file.name}
                              </a>
                              {file.description && (
                                <div
                                  className="text-muted-foreground overflow-hidden text-xs text-ellipsis whitespace-nowrap"
                                  title={file.description}
                                >
                                  {file.description}
                                </div>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="lg:hidden"
                              onClick={() => setFileDetailsDrawer(file)}
                            >
                              <Menu className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                        <td className="hidden max-w-[200px] px-6 py-4 lg:table-cell">
                          <div
                            className="text-muted-foreground overflow-hidden text-sm text-ellipsis whitespace-nowrap"
                            title={file.mime}
                          >
                            {file.mime}
                          </div>
                        </td>
                        <td className="hidden px-6 py-4 lg:table-cell">
                          <div className="text-muted-foreground overflow-hidden text-sm text-ellipsis whitespace-nowrap">
                            {formatDate(file.created)}
                          </div>
                        </td>
                        <td className="hidden min-w-[144px] px-6 py-4 text-right whitespace-nowrap lg:table-cell">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownload(file.name)}
                              title="Download"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRename(file.id, file.name)}
                              title="Rename"
                              disabled={renameMutation.isPending}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(file.id, file.name)}
                              title="Delete"
                              className="hover:text-destructive"
                              disabled={deleteMutation.isPending}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </>
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className={cn(
                        "text-muted-foreground px-6 py-4 text-center",
                        isFetching && "opacity-50",
                      )}
                    >
                      No files found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Loading Overlay */}
            {isFetching && (
              <div className="bg-background/50 absolute inset-0 flex items-center justify-center" />
            )}
          </div>
        </div>
      </div>

      {/* File Details Drawer */}
      <Drawer
        open={!!fileDetailsDrawer}
        onOpenChange={(open: boolean) => !open && setFileDetailsDrawer(null)}
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{fileDetailsDrawer?.name}</DrawerTitle>
            {fileDetailsDrawer?.description && (
              <DrawerDescription>
                {fileDetailsDrawer.description}
              </DrawerDescription>
            )}
          </DrawerHeader>
          <div className="space-y-4 px-4 py-2">
            <div>
              <div className="text-sm font-medium">Type</div>
              <div className="text-muted-foreground text-sm">
                {fileDetailsDrawer?.mime}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium">Created</div>
              <div className="text-muted-foreground text-sm">
                {fileDetailsDrawer && formatDate(fileDetailsDrawer.created)}
              </div>
            </div>
          </div>
          <DrawerFooter>
            <div className="flex gap-2">
              <Button
                className="flex-1"
                variant="outline"
                onClick={() =>
                  fileDetailsDrawer && handleDownload(fileDetailsDrawer.name)
                }
              >
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
              <Button
                className="flex-1"
                variant="outline"
                onClick={() =>
                  fileDetailsDrawer &&
                  handleRename(fileDetailsDrawer.id, fileDetailsDrawer.name)
                }
                disabled={renameMutation.isPending}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Rename
              </Button>
              <Button
                className="flex-1"
                variant="destructive"
                onClick={() =>
                  fileDetailsDrawer &&
                  handleDelete(fileDetailsDrawer.id, fileDetailsDrawer.name)
                }
                disabled={deleteMutation.isPending}
              >
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Rename Dialog/Drawer */}
      {isMobile ? (
        <>
          <Drawer
            open={!!renameDialog}
            onOpenChange={(open: boolean) => !open && setRenameDialog(null)}
          >
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Rename File</DrawerTitle>
                <DrawerDescription>
                  Enter a new name for "{renameDialog?.name}"
                </DrawerDescription>
              </DrawerHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleRenameSubmit();
                }}
              >
                <div className="px-4 py-2">
                  <Input
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    placeholder="Enter new name"
                    className="w-full"
                    disabled={renameMutation.isPending}
                  />
                </div>
                <DrawerFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setRenameDialog(null)}
                    disabled={renameMutation.isPending}
                    className="w-full"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={renameMutation.isPending}
                    className="w-full"
                  >
                    {renameMutation.isPending ? "Renaming..." : "Rename"}
                  </Button>
                </DrawerFooter>
              </form>
            </DrawerContent>
          </Drawer>

          <Drawer
            open={!!deleteDialog}
            onOpenChange={(open: boolean) => !open && setDeleteDialog(null)}
          >
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Delete File</DrawerTitle>
                <DrawerDescription>
                  <p className="text-foreground text-base">
                    Are you sure you want to delete {deleteDialog?.name}?
                  </p>
                  <p className="text-muted-foreground mt-2 text-sm">
                    This action cannot be undone.
                  </p>
                </DrawerDescription>
              </DrawerHeader>

              <DrawerFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeleteDialog(null)}
                  disabled={deleteMutation.isPending}
                  className="w-full"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDeleteConfirm}
                  disabled={deleteMutation.isPending}
                  className="w-full"
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
            open={!!renameDialog}
            onOpenChange={(open: boolean) => !open && setRenameDialog(null)}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Rename File</DialogTitle>
                <DialogDescription>
                  Enter a new name for "{renameDialog?.name}"
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleRenameSubmit();
                }}
              >
                <div className="pb-4">
                  <Input
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    placeholder="Enter new name"
                    className="w-full"
                    disabled={renameMutation.isPending}
                  />
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setRenameDialog(null)}
                    disabled={renameMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={renameMutation.isPending}>
                    {renameMutation.isPending ? "Renaming..." : "Rename"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog
            open={!!deleteDialog}
            onOpenChange={(open: boolean) => !open && setDeleteDialog(null)}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete File</DialogTitle>
                <DialogDescription>
                  <p className="text-foreground text-base">
                    Are you sure you want to delete {deleteDialog?.name}?
                  </p>
                  <p className="text-muted-foreground mt-2 text-sm">
                    This action cannot be undone.
                  </p>
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeleteDialog(null)}
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

      {/* Load More Button */}
      {hasNextPage && (
        <div className="mt-4 text-center">
          <Button
            variant="outline"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? "Loading more..." : "Load more files"}
          </Button>
        </div>
      )}
    </div>
  );
}
