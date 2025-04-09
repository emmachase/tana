import { db } from "../db";
import { upload } from "../db/schema";
import { eq } from "drizzle-orm";
import sharp from "sharp";
import { readFile } from "fs/promises";
import type { Route } from "./+types/image";
import path from "path";
import { env } from "~/env";
import ffmpeg from "fluent-ffmpeg";

// Variable to track if ffmpeg is available
let ffmpegAvailable: boolean | null = null;

// Check if ffmpeg is available
async function checkFfmpegAvailable(): Promise<boolean> {
  if (ffmpegAvailable !== null) return ffmpegAvailable;

  return new Promise((resolve) => {
    ffmpeg.getAvailableFormats((err) => {
      if (err) {
        console.warn("FFmpeg not available:", err.message);
        ffmpegAvailable = false;
        resolve(false);
      } else {
        ffmpegAvailable = true;
        resolve(true);
      }
    });
  });
}

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

/**
 * Extract the first frame from a video file using ffmpeg
 * @param filePath Path to the video file
 * @returns Buffer containing the first frame image data
 */
async function extractVideoFrame(filePath: string): Promise<Buffer> {
  // Check if ffmpeg is available
  const isAvailable = await checkFfmpegAvailable();
  if (!isAvailable) {
    throw new Error("FFmpeg is not available");
  }

  return new Promise((resolve, reject) => {
    // Create a stream for the output instead of using a temp file
    const buffers: Buffer[] = [];

    ffmpeg(filePath)
      .frames(1) // Only extract one frame
      .outputFormat("image2pipe") // Pipe the output
      .outputOptions(["-vframes", "1", "-f", "image2pipe", "-vcodec", "png"])
      .on("end", () => {
        // Combine all buffer chunks
        const buffer = Buffer.concat(buffers);
        resolve(buffer);
      })
      .on("error", (err) => {
        reject(new Error(`Failed to extract video frame: ${err.message}`));
      })
      .pipe()
      .on("data", (chunk: Buffer) => {
        buffers.push(chunk);
      });
  });
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

    const filePath = path.join(env.ROOT_DIR, file.filePath);

    if (file.mime.startsWith("image")) {
      const image = sharp(filePath);
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
    } else if (file.mime.startsWith("video") && thumbSize) {
      try {
        // Only try to generate thumbnails if FFmpeg is available
        const isAvailable = await checkFfmpegAvailable();
        if (!isAvailable) {
          console.warn("Skipping video thumbnail - FFmpeg not available");
          data = await readFile(filePath);
        } else {
          // Extract the first frame from the video
          const frameBuffer = await extractVideoFrame(filePath);

          // Use sharp to resize the thumbnail if needed
          const image = sharp(frameBuffer);
          const meta = await image.metadata();
          const sizer =
            meta.width! > meta.height!
              ? { height: thumbSize }
              : { width: thumbSize };

          data = await image.resize(sizer).toBuffer();

          // Cache the thumbnail with image/png mime type since we're converting to PNG
          insertIntoCache(filename, thumbSize, data, "image/png");

          return new Response(data, {
            headers: {
              "Content-Type": "image/png",
            },
          });
        }
      } catch (error) {
        console.error("Video thumbnail generation failed:", error);
        // Fall back to reading the file directly
        data = await readFile(filePath);
      }
    } else {
      data = await readFile(filePath);
    }

    return new Response(data, {
      headers: {
        "Content-Type": file.mime,
      },
    });
  }

  return new Response("File not found", { status: 404 });
}
