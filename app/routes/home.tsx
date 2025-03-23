import { useTRPC } from "~/lib/trpc";
import type { Route } from "./+types/home";
import { useInfiniteQuery } from "@tanstack/react-query";
import { prefetch } from "~/lib/prefetch";
import { Card, CardContentType } from "~/components/card";
import { useState, useRef, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

const CARD_WIDTH = 200;
const CARD_HEIGHT = 200;
const LOAD_BATCH_SIZE = 50;

export const links: Route.LinksFunction = () => [
  { rel: "icon", href: "/favicon.svg" },
];

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Jebsite" },
    { name: "description", content: "Welcome to my Jebsite!" },
  ];
}

export const unstable_middleware: Route.unstable_MiddlewareFunction[] = [
  async ({ context }) => {
    const { queryClient, trpc } = prefetch(context);

    // Block the page to prefetch
    await queryClient.prefetchInfiniteQuery(
      trpc.list.infiniteQueryOptions({
        gallery: true,
        limit: LOAD_BATCH_SIZE,
      }),
    );

    // Or, if you don't want to block the page:
    // void queryClient.prefetchQuery(trpc.hero.message.queryOptions());

    // If you need to prevent internal navigations from causing prefetching, use skipIfSameOrigin
    // await skipIfSameOrigin(request, async () => {
    //   await queryClient.prefetchQuery(trpc.hero.message.queryOptions());
    // });
  },
];

function Gallery() {
  const trpc = useTRPC();
  const parentRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const {
    data: uploads,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery(
    trpc.list.infiniteQueryOptions(
      {
        gallery: true,
        limit: LOAD_BATCH_SIZE,
      },
      {
        getNextPageParam: (lastPage) => {
          return lastPage[lastPage.length - 1]?.id;
        },
      },
    ),
  );

  const flatUploads = uploads?.pages.flatMap((page) => page || []) ?? [];

  const getNumColumns = (width: number) =>
    Math.max(1, Math.floor(width / CARD_WIDTH));

  const numColumns = getNumColumns(size.width);

  // Calculate row count based on our data and columns
  const rowCount = Math.ceil(
    (hasNextPage ? flatUploads.length + LOAD_BATCH_SIZE : flatUploads.length) /
      numColumns,
  );

  // Create our virtualizer
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => CARD_HEIGHT,
    overscan: 5,
  });

  // Set up a resize observer to update dimensions
  useEffect(() => {
    if (!parentRef.current) return;

    // Set initial size immediately
    const { width, height } = parentRef.current.getBoundingClientRect();
    setSize({ width, height });

    const resizeObserver = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setSize({ width, height });
    });

    resizeObserver.observe(parentRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Load more when we reach the threshold
  useEffect(() => {
    if (size.width === 0) return; // Skip this effect during SSR

    const lastVisibleItemIndex = rowVirtualizer.range?.endIndex
      ? rowVirtualizer.range.endIndex * numColumns
      : 0;

    if (
      hasNextPage &&
      lastVisibleItemIndex >= flatUploads.length - numColumns * 2
    ) {
      fetchNextPage();
    }
  }, [
    fetchNextPage,
    hasNextPage,
    flatUploads.length,
    numColumns,
    rowVirtualizer.range,
    size.width,
  ]);

  // Render a grid cell
  const renderGridCell = (rowIndex: number, columnIndex: number) => {
    const idx = rowIndex * numColumns + columnIndex;

    // Show skeleton card if we're beyond loaded images
    if (idx >= flatUploads.length) {
      if (!hasNextPage) {
        return null; // No more images to load
      }

      return (
        <div className="flex h-full items-center justify-center">
          <Card />
        </div>
      );
    }

    const image = flatUploads[idx];
    return (
      <div className="flex h-full items-center justify-center">
        <Card
          key={image.name ?? idx}
          url={image.name}
          type={
            image.mime.startsWith("video")
              ? CardContentType.VIDEO
              : CardContentType.IMAGE
          }
        />
      </div>
    );
  };

  // Render a CSS Grid for SSR
  const renderCSSGrid = () => {
    return (
      <div
        className="grid w-full"
        style={{
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gridAutoRows: "200px",
        }}
      >
        {flatUploads.map((image, idx) => (
          <div
            key={image.name ?? idx}
            className="flex items-center justify-center"
          >
            <Card
              url={image.name}
              type={
                image.mime.startsWith("video")
                  ? CardContentType.VIDEO
                  : CardContentType.IMAGE
              }
            />
          </div>
        ))}
        {hasNextPage &&
          // Add skeleton cards for loading state
          Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={`skeleton-${idx}`}
              className="flex items-center justify-center"
            >
              <Card />
            </div>
          ))}
      </div>
    );
  };

  return (
    <div
      ref={parentRef}
      className="max-w-1000px px-safe m-auto w-full flex-1 overflow-auto"
      style={{ maxHeight: "calc(100vh - 80px)" }}
      tabIndex={-1}
    >
      {size.width === 0 ? (
        // Use CSS Grid during SSR and initial client render
        renderCSSGrid()
      ) : (
        // Use virtualization once we have container size
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const rowIndex = virtualRow.index;

            return (
              <div
                key={virtualRow.key}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                  display: "flex",
                }}
              >
                {Array.from({ length: numColumns }).map((_, columnIndex) => {
                  // Calculate the column width as a percentage
                  const columnWidth = `${100 / numColumns}%`;

                  return (
                    <div
                      key={`${rowIndex}-${columnIndex}`}
                      style={{
                        width: columnWidth,
                        height: CARD_HEIGHT,
                        padding: "8px",
                      }}
                    >
                      {renderGridCell(rowIndex, columnIndex)}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  // const message = useQuery(trpc.hero.message.queryOptions());

  return (
    <main className="flex min-h-dvh flex-col items-center p-4 pb-0">
      <h1 className="text-4xl">Jebsite</h1>
      {/* <p className="animate-shimmer bg-gradient-to-r from-gray-500 via-gray-300 to-gray-500 bg-[size:200%_100%] bg-clip-text text-sm text-transparent">
        {message.data}
      </p> */}
      <Gallery />
      {/* <div className="grid grid-cols-3 gap-4">
        {uploads?.pages
          .flatMap((page) => page || [])
          .map((upload) => (
            <div key={upload.id}>
              <div className="flex flex-col gap-2">
                <div className="aspect-square overflow-hidden rounded-md">
                  <img
                    src={`/${upload.name}`}
                    alt={upload.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="text-sm">{upload.name}</div>
              </div>
            </div>
          ))}
      </div> */}
    </main>
  );
}
