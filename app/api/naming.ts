import { readFile } from "fs/promises";
import { randomString36 } from "~/lib/crypto";

class TemplateError extends Error {}

const fileCache: Record<string, string[]> = {};
async function getListFile(name: string): Promise<string[]> {
  if (fileCache[name]) return fileCache[name];

  const file = await readFile(name);
  const contents = file.toString("ascii");
  const lines = contents.split("\n");

  return (fileCache[name] = lines);
}

type TemplateFunction = (...args: string[]) => Promise<string>;
const templateCommands: Record<string, TemplateFunction | undefined> = {
  async chars(countStr) {
    const count = +countStr;
    if (!count) throw new TemplateError("invalid count for chars template");

    return await randomString36(count);
  },

  async pick(filename) {
    const list = await getListFile(filename);
    return list[(Math.random() * list.length) | 0].trim();
  },
};

async function replaceAsync(
  str: string,
  regex: RegExp,
  asyncFn: TemplateFunction,
) {
  const promises: Promise<string>[] = [];
  str.replace(regex, (match, ...args) => {
    const promise = asyncFn(match, ...args);
    promises.push(promise);

    return ""; // Dummy, doesn't matter what we give
  });

  const data = await Promise.all(promises);
  return str.replace(regex, () => data.shift() ?? "");
}

export function pickTemplateName(template: string): Promise<string> {
  return replaceAsync(template, /{(.+?)}/g, async (_, command: string) => {
    const [name, ...args] = command.split(/\s+/);

    const resolver = templateCommands[name];
    if (resolver) {
      return resolver(...args);
    } else {
      throw new TemplateError(`invalid command '${name}'`);
    }
  });
}
