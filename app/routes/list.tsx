import type { Route } from "./+types/list";
import { useTRPC } from "~/lib/trpc";
import { useInfiniteQuery } from "@tanstack/react-query";
import { prefetch } from "~/lib/prefetch";
import { useState } from "react";
import { cn } from "~/lib/utils";
import { Header } from "~/components/header";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Download, Trash, Pencil, Search } from "lucide-react";
import { useScrollState } from "~/hooks/useScrollState";
import { useDebounce } from "~/hooks/useDebounce";

const LOAD_BATCH_SIZE = 50;

export function meta({}: Route.MetaArgs) {
  return [
    { title: "File List - Emmages" },
    { name: "description", content: "File management for Emmages!" },
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
  const scrolled = useScrollState();
  const [inputQuery, setInputQuery] = useState("");
  const searchQuery = useDebounce(inputQuery, 200);

  // Fetch file data
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
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

  // Action handlers (placeholders for now)
  const handleDelete = (id: number, name: string) => {
    console.log(`Delete file: ${id} - ${name}`);
    // Will be implemented with trpc.delete.mutate(id)
  };

  const handleRename = (id: number, name: string) => {
    console.log(`Rename file: ${id} - ${name}`);
    // Will be implemented with a modal and trpc.rename.mutate({ id, newName })
  };

  const handleDownload = (name: string) => {
    console.log(`Download file: ${name}`);
    // Create a temporary anchor element to trigger download
    const link = document.createElement("a");
    link.href = `/${name}`;
    link.download = name; // Set the download attribute to force download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenFile = (name: string) => {
    window.open(`/${name}`, "_blank");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // No need to explicitly trigger search as it's handled by the debounced state
  };

  return (
    <main className="py-0 sm:p-4">
      <div>
        <Header
          className={cn(
            "m-auto transition-[max-width]",
            scrolled ? "max-w-full" : "max-w-[1000px]",
          )}
        />

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
          <div className="rounded-lg border shadow-sm">
            <table className="divide-border w-full divide-y">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-muted-foreground px-6 py-3 text-left text-xs font-medium tracking-wider uppercase">
                    Name
                  </th>
                  <th className="text-muted-foreground px-6 py-3 text-left text-xs font-medium tracking-wider uppercase">
                    Type
                  </th>
                  <th className="text-muted-foreground px-6 py-3 text-left text-xs font-medium tracking-wider uppercase">
                    Date
                  </th>
                  <th className="text-muted-foreground px-6 py-3 text-right text-xs font-medium tracking-wider uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-background divide-border divide-y">
                {flatData.length > 0 ? (
                  flatData.map((file) => (
                    <tr
                      key={file.id}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium">
                          <a
                            href={`/${file.name}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary cursor-pointer hover:underline"
                            onClick={(e) => {
                              e.preventDefault();
                              handleOpenFile(file.name);
                            }}
                          >
                            {file.name}
                          </a>
                        </div>
                        {file.description && (
                          <div className="text-muted-foreground text-xs">
                            {file.description}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-muted-foreground text-sm">
                          {file.mime}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-muted-foreground text-sm">
                          {formatDate(file.created)}
                        </div>
                      </td>
                      <td className="space-x-2 px-6 py-4 text-right text-sm font-medium whitespace-nowrap">
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
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(file.id, file.name)}
                          title="Delete"
                          className="hover:text-destructive"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-muted-foreground px-6 py-4 text-center"
                    >
                      No files found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

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
      </div>
    </main>
  );
}
