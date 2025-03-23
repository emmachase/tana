import { db } from "../db";
import { upload } from "../db/schema";
import { eq } from "drizzle-orm";
import sharp from "sharp";
import { readFile } from "fs/promises";
import type { Route } from "./+types/image";

const CACHE_SIZE = 50;
let rollingCache: {
  name: string;
  size: number | null;
  file: Buffer;
  mime: string;
}[] = [];

function insertIntoCache(
  name: string,
  size: number | null,
  file: Buffer,
  mime: string,
) {
  rollingCache.unshift({ name, size, file, mime });
  if (rollingCache.length > CACHE_SIZE) {
    rollingCache.pop();
  }
}

export function purgeCache(): void {
  rollingCache = [];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const thumbSize = url.searchParams.get("size")
    ? +url.searchParams.get("size")!
    : null;

  const filename = params.object;

  if (!filename) {
    return new Response("File not found", { status: 404 });
  }

  // First check if it's in the cache
  const cachedFile = rollingCache.find(
    (x) => x.name === filename && x.size === thumbSize,
  );

  if (cachedFile) {
    return new Response(cachedFile.file, {
      headers: {
        "Content-Type": cachedFile.mime,
      },
    });
  }

  const [file] = await db
    .select()
    .from(upload)
    .where(eq(upload.name, filename))
    .limit(1);

  if (file) {
    // Result vars
    let data: Buffer;

    if (file.mime.startsWith("image")) {
      const image = sharp(file.filePath);
      if (thumbSize) {
        const meta = await image.metadata();
        const sizer =
          meta.width! > meta.height!
            ? { height: thumbSize }
            : { width: thumbSize };

        data = await image.resize(sizer).toBuffer();

        insertIntoCache(filename, thumbSize, data, file.mime);
      } else {
        data = await image.toBuffer();

        insertIntoCache(filename, null, data, file.mime);
      }
    } else {
      data = await readFile(file.filePath);
    }

    return new Response(data, {
      headers: {
        "Content-Type": file.mime,
      },
    });
  }

  return new Response("File not found", { status: 404 });
}
