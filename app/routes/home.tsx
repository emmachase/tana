import { useTRPC } from "~/lib/trpc";
import type { Route } from "./+types/home";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { prefetch } from "~/lib/prefetch";
import { Card, CardContentType } from "~/components/card";
import { useRef, useEffect } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useIsMobile, useSize } from "~/hooks/useSize";
import { useScrollState } from "~/hooks/useScrollState";
import { cn } from "~/lib/utils";
import { Header } from "~/components/header";

const LOAD_BATCH_SIZE = 200;

export function meta({}: Route.MetaArgs) {
  return [{ title: "Emmages - Gallery" }];
}

export const unstable_middleware: Route.unstable_MiddlewareFunction[] = [
  async ({ context }) => {
    const { queryClient, trpc } = prefetch(context);

    const { initialCursor } = await queryClient.fetchQuery(
      trpc.list.init.queryOptions({
        gallery: true,
      }),
    );

    // Block the page to prefetch
    await queryClient.prefetchInfiniteQuery(
      trpc.list.getPage.infiniteQueryOptions({
        gallery: true,
        limit: LOAD_BATCH_SIZE,
        cursor: initialCursor,
      }),
    );
  },
];

const LG_CARD_WIDTH = 200;
const LG_CARD_HEIGHT = 200;
const LG_COLS_CLASS = "md:grid-cols-[repeat(auto-fill,200px)]";
const LG_ROWS_CLASS = "md:auto-rows-[200px]";

const SM_CARD_WIDTH = 100;
const SM_CARD_HEIGHT = 100;
const SM_COLS_CLASS = "grid-cols-[repeat(auto-fill,100px)]";
const SM_ROWS_CLASS = "auto-rows-[100px]";

function Gallery(props: React.ComponentProps<"div">) {
  const trpc = useTRPC();
  const containerRef = useRef<HTMLDivElement>(null);
  const { width } = useSize(containerRef);

  const isMobile = useIsMobile();
  const CARD_WIDTH = isMobile ? SM_CARD_WIDTH : LG_CARD_WIDTH;
  const CARD_HEIGHT = isMobile ? SM_CARD_HEIGHT : LG_CARD_HEIGHT;

  const { data: initData } = useQuery(
    trpc.list.init.queryOptions({
      gallery: true,
    }),
  );

  const { data, fetchNextPage, hasNextPage } = useInfiniteQuery(
    trpc.list.getPage.infiniteQueryOptions(
      {
        gallery: true,
        limit: LOAD_BATCH_SIZE,
      },
      {
        initialCursor: initData?.initialCursor,
        getNextPageParam: (lastPage) => {
          return lastPage.nextCursor;
        },
      },
    ),
  );

  const flatData = data?.pages.flatMap((page) => page.items) ?? [];

  const numColumns = Math.max(1, Math.floor(width / CARD_WIDTH));

  // Calculate row count based on our data and columns
  const rowCount = Math.ceil(
    initData
      ? initData.itemCount / numColumns
      : (hasNextPage ? flatData.length + LOAD_BATCH_SIZE : flatData.length) /
          numColumns,
  );

  // Create our virtualizer
  const rowVirtualizer = useWindowVirtualizer({
    count: rowCount,
    // getScrollElement: () => parentRef.current,
    estimateSize: () => CARD_HEIGHT,
    overscan: 5,
  });

  // Load more when we reach the threshold
  useEffect(() => {
    if (width === 0) return; // Skip this effect during SSR

    const lastVisibleItemIndex = rowVirtualizer.range?.endIndex
      ? rowVirtualizer.range.endIndex * numColumns
      : 0;

    if (
      hasNextPage &&
      lastVisibleItemIndex >= flatData.length - numColumns * 2
    ) {
      fetchNextPage();
    }
  }, [
    fetchNextPage,
    hasNextPage,
    flatData.length,
    numColumns,
    rowVirtualizer.range,
    width,
  ]);

  // Render a grid cell
  const renderGridCell = (rowIndex: number, columnIndex: number) => {
    const idx = rowIndex * numColumns + columnIndex;

    // Show skeleton card if we're beyond loaded images
    if (idx >= flatData.length) {
      const maxIdx = initData ? initData.itemCount : Infinity;
      if (!hasNextPage || idx >= maxIdx) {
        return null; // No more images to load
      }

      return (
        <div className="flex h-full items-center justify-center">
          <Card />
        </div>
      );
    }

    const image = flatData[idx];
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
        className={cn(
          "grid w-full justify-center",
          SM_COLS_CLASS,
          SM_ROWS_CLASS,
          LG_COLS_CLASS,
          LG_ROWS_CLASS,
        )}
      >
        {flatData.map((image, idx) => (
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
    <div ref={containerRef} {...props}>
      {width === 0 ? (
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
                className="absolute top-0 left-0 flex w-full justify-center"
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {Array.from({ length: numColumns }).map((_, columnIndex) => {
                  return (
                    <div
                      key={`${rowIndex}-${columnIndex}`}
                      className="aspect-square"
                      style={{
                        height: CARD_HEIGHT,
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
  const scrolled = useScrollState();

  return (
    <main className="py-0 sm:p-4">
      <div className="">
        <Header
          className={cn(
            "m-auto transition-[max-width]",
            scrolled ? "max-w-full" : "max-w-[1000px]",
          )}
        />
        <Gallery className="m-auto max-w-[1200px]" />
      </div>
    </main>
  );
}
