import { eq } from "drizzle-orm";
import { db } from "~/db";
import { tag as tagTable, upload as uploadTable } from "~/db/schema";
import { pickTemplateName } from "./naming";
import { authedProcedure } from "./trpc";
import * as v from "valibot";
import { env } from "~/env";
import path from "path";
import { mkdir } from "fs/promises";
import { createWriteStream } from "fs";
import { ReadableStream } from "stream/web";
import { Readable } from "stream";
import { randomString36 } from "~/lib/crypto";

function directoryDiscriminator() {
  const date = new Date();
  return `./images/${date.getUTCFullYear()}-${date.getUTCMonth()}`;
}

const RETRIES = 20;
const TOO_MANY_TRIES = "Couldn't generate file name, exceeded retry count";
async function generateName(template: string, ext: string) {
  let name: string,
    tries = 0;

  do {
    if (tries++ >= RETRIES) {
      throw TOO_MANY_TRIES;
    }

    name = (await pickTemplateName(template)) + ext;
  } while (
    db.select().from(uploadTable).where(eq(uploadTable.name, name)).get()
  );

  return name;
}

const uploadSchema = v.object({
  name: v.optional(v.string()),
  description: v.optional(v.string()),
  tags: v.optional(v.array(v.string())),
  file: v.instance(File),
});

async function parseFormData(input: FormData) {
  const object = {} as Record<string, unknown>;
  for (const [key, value] of input.entries()) {
    if (key === "tags") {
      // Handle tags as array - accumulate multiple entries with the same key
      if (!object[key]) {
        object[key] = [];
      }
      (object[key] as unknown[]).push(value);
    } else {
      object[key] = value;
    }
  }

  return object;
}

export const upload = authedProcedure("upload")
  .input(
    v.pipeAsync(
      v.instance(FormData),
      v.transformAsync(parseFormData),
      uploadSchema,
    ),
  )
  .mutation(async ({ input, ctx }) => {
    const {
      file,
      name = await generateName(env.NAMING_TEMPLATE, path.extname(file.name)),
      description = "",
      tags = [],
    } = input;

    // Create directory if it doesn't exist
    const directory = directoryDiscriminator();
    await mkdir(path.join(env.ROOT_DIR, directory), { recursive: true });

    // Save the file
    const filePath = path.join(
      env.ROOT_DIR,
      directory,
      `${await randomString36()}.${name}`,
    );

    const writeStream = createWriteStream(filePath);
    Readable.fromWeb(file.stream() as ReadableStream<unknown>).pipe(
      writeStream,
    );

    // Insert into database
    const uploadRecord = db
      .insert(uploadTable)
      .values({
        name,
        description,
        filePath,
        mime: file.type,
      })
      .returning()
      .get();

    // Add tags if provided
    if (tags.length > 0) {
      const tagValues = tags.map((tagName) => ({
        uploadId: uploadRecord.id,
        value: tagName,
      }));

      db.insert(tagTable).values(tagValues).run();
    }

    const reqUrl = new URL(ctx.req.url);
    const origin = reqUrl.origin;
    const url = `${origin}/${name}`;

    return {
      id: uploadRecord.id,
      name,
      url,
    };
  });
