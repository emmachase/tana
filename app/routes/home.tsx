import { useTRPC } from "~/lib/trpc";
import type { Route } from "./+types/home";
import { useInfiniteQuery } from "@tanstack/react-query";
import { prefetch } from "~/lib/prefetch";
import { Card, CardContentType } from "~/components/card";
import { useRef, useEffect } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { useSize } from "~/hooks/useSize";
import { useScrollState } from "~/hooks/useScrollState";
import { cn } from "~/lib/utils";
import { Logo } from "~/components/logo";
import { Button } from "~/components/ui/button";
import { useNavigate } from "react-router";

const CARD_WIDTH = 200;
const CARD_HEIGHT = 200;
const LOAD_BATCH_SIZE = 5;

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
  },
];

function Gallery(props: React.ComponentProps<"div">) {
  const trpc = useTRPC();
  const containerRef = useRef<HTMLDivElement>(null);
  const { width } = useSize(containerRef);

  const { data, fetchNextPage, hasNextPage } = useInfiniteQuery(
    trpc.list.infiniteQueryOptions(
      {
        gallery: true,
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

  const getNumColumns = (width: number) =>
    Math.max(1, Math.floor(width / CARD_WIDTH));

  const numColumns = getNumColumns(width);

  // Calculate row count based on our data and columns
  const rowCount = Math.ceil(
    (hasNextPage ? flatData.length + LOAD_BATCH_SIZE : flatData.length) /
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
      if (!hasNextPage) {
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
        className="grid w-full justify-between"
        style={{
          gridTemplateColumns: "repeat(auto-fill, 200px)",
          gridAutoRows: "200px",
        }}
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
                className="absolute top-0 left-0 flex w-full justify-between"
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {Array.from({ length: numColumns }).map((_, columnIndex) => {
                  // Calculate the column width as a percentage
                  // const columnWidth = `${100 / numColumns}%`;

                  return (
                    <div
                      key={`${rowIndex}-${columnIndex}`}
                      className="aspect-square"
                      style={{
                        // width: columnWidth,
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

function Header({ className, ...props }: React.ComponentProps<"div">) {
  const navigate = useNavigate();
  const scrolled = useScrollState();

  return (
    <div
      className={cn("sticky top-0 z-10 flex self-stretch p-4", className)}
      {...props}
    >
      <div
        className={cn(
          "flex flex-1 items-center rounded-xl border p-4 transition-[background,border] duration-300",
          scrolled
            ? "bg-popover/50 border-border/50 backdrop-blur-sm"
            : "border-transparent bg-transparent",
        )}
      >
        <Logo className="h-12 w-auto" />

        <div className="flex-1" />

        <Button
          variant="ghostPrimary"
          onClick={() => {
            navigate("/logout");
          }}
        >
          Logout
        </Button>
      </div>
    </div>
  );
}

export default function Home() {
  const scrolled = useScrollState();

  return (
    <main className="p-4 py-0">
      <div className="">
        <Header
          className={cn(
            "m-auto transition-[max-width]",
            scrolled ? "max-w-full" : "max-w-[1000px]",
          )}
        />
        <Gallery className="m-auto max-w-[1000px]" />
      </div>
    </main>
  );
}
