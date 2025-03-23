import { useTRPC } from "~/lib/trpc";
import type { Route } from "./+types/home";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { prefetch } from "~/lib/prefetch";
import { Card, CardContentType } from "~/components/card";
import { useState } from "react";
import { AutoSizer, InfiniteLoader, Grid, type Size } from "react-virtualized";

const CARD_WIDTH = 200;
const CARD_HEIGHT = 200;
const LOAD_BATCH_SIZE = 50;
const VIRTUAL_LIST_SIZE = 1000000;

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
    await queryClient.prefetchQuery(trpc.hero.message.queryOptions());

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

  const [maxRequestedIndex, setMaxRequestedIndex] = useState(0);

  // const [images, setImages] = useState<ImageModel[]>([]);

  // const fetchData = async (startIndex: number, stopIndex: number) => {
  //   const newImages = await imageManager.current.fetchData(
  //     startIndex,
  //     stopIndex,
  //   );
  //   setImages([...newImages]);
  // };

  const flatUploads = uploads?.pages.flatMap((page) => page || []) ?? [];

  const isRowLoaded = ({ index }: { index: number }) => {
    return Boolean(flatUploads[index]);
  };

  const cellRenderer =
    (numColumns: number) =>
    ({
      columnIndex,
      key,
      rowIndex,
      style,
    }: {
      columnIndex: number;
      key: string;
      rowIndex: number;
      style: React.CSSProperties;
    }) => {
      const idx = rowIndex * numColumns + columnIndex;

      // Show skeleton card if we're beyond loaded images
      if (idx >= flatUploads.length) {
        if (!hasNextPage) {
          return null; // No more images to load
        }

        return (
          <div
            key={key}
            className="flex items-center justify-center"
            style={style}
          >
            <Card />
          </div>
        );
      }

      const image = flatUploads[idx];
      return (
        <div
          key={key}
          className="flex items-center justify-center"
          style={style}
        >
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

  const getNumColumns = (width: number) =>
    Math.max(1, Math.floor(width / CARD_WIDTH));

  const getColumnWidth = (width: number, numColumns: number) => {
    return width / numColumns;
  };

  const getNumRows = (numColumns: number) => {
    if (!hasNextPage) {
      return Math.ceil(flatUploads.length / numColumns);
    }

    // Calculate actual rows needed for current data plus one batch
    return Math.ceil((maxRequestedIndex + LOAD_BATCH_SIZE) / numColumns);
  };

  return (
    <div className="max-w-1000px px-safe m-auto w-full flex-1">
      <AutoSizer>
        {({ width, height }: Size) => {
          const numColumns = getNumColumns(width);
          const columnWidth = getColumnWidth(width, numColumns);
          const numRows = getNumRows(numColumns);

          return (
            <InfiniteLoader
              isRowLoaded={isRowLoaded}
              loadMoreRows={({ stopIndex }) => {
                setMaxRequestedIndex(stopIndex);
                return fetchNextPage();
              }}
              rowCount={VIRTUAL_LIST_SIZE}
              minimumBatchSize={LOAD_BATCH_SIZE}
              threshold={10}
            >
              {({ onRowsRendered, registerChild }) => (
                <Grid
                  ref={registerChild}
                  cellRenderer={cellRenderer(numColumns)}
                  columnCount={numColumns}
                  columnWidth={columnWidth}
                  height={height}
                  rowCount={numRows}
                  rowHeight={CARD_HEIGHT}
                  width={width}
                  onSectionRendered={({
                    rowStartIndex,
                    rowStopIndex,
                    columnStartIndex,
                    columnStopIndex,
                  }) => {
                    onRowsRendered({
                      startIndex: rowStartIndex * numColumns + columnStartIndex,
                      stopIndex: rowStopIndex * numColumns + columnStopIndex,
                    });
                  }}
                />
              )}
            </InfiniteLoader>
          );
        }}
      </AutoSizer>
    </div>
  );
}

export default function Home() {
  const trpc = useTRPC();
  const message = useQuery(trpc.hero.message.queryOptions());

  return (
    <main className="flex min-h-dvh flex-col items-center p-4 pb-0">
      <h1 className="text-4xl">Jebsite</h1>
      <p className="animate-shimmer bg-gradient-to-r from-gray-500 via-gray-300 to-gray-500 bg-[size:200%_100%] bg-clip-text text-sm text-transparent">
        {message.data}
      </p>
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
