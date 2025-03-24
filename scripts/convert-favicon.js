import { exec } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { promisify } from "util";

const execAsync = promisify(exec);

// Get the directory name
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Path to source and destination files
const srcPath = path.join(__dirname, "../public/favicon.png");
const destPath = path.join(__dirname, "../public/favicon.ico");
const appleTouchIconPath = path.join(
  __dirname,
  "../public/apple-touch-icon.png",
);

// Convert favicon.png to favicon.ico and generate apple-touch-icon using ImageMagick
async function convertIcons() {
  try {
    console.log(
      "Converting favicon.png to favicon.ico and apple-touch-icon.png using ImageMagick...",
    );

    // Check if ImageMagick is installed
    try {
      await execAsync("magick --version");
    } catch {
      console.error(
        "ImageMagick not found. Please install it with: brew install imagemagick",
      );
      process.exit(1);
    }

    // Use ImageMagick to convert PNG to ICO with multiple sizes
    const icoCommand = `magick "${srcPath}" -define icon:auto-resize=16,32,48,64 "${destPath}"`;

    // Create Apple Touch Icon (180x180 pixels is the recommended size)
    const appleTouchIconCommand = `magick "${srcPath}" -resize 180x180 -background none "${appleTouchIconPath}"`;

    // Execute both commands
    const icoResult = await execAsync(icoCommand);
    if (icoResult.stderr) {
      console.error(`ImageMagick error (favicon.ico): ${icoResult.stderr}`);
    } else {
      console.log(`Favicon.ico successfully created at ${destPath}`);
    }

    const touchIconResult = await execAsync(appleTouchIconCommand);
    if (touchIconResult.stderr) {
      console.error(
        `ImageMagick error (apple-touch-icon): ${touchIconResult.stderr}`,
      );
    } else {
      console.log(
        `Apple Touch Icon successfully created at ${appleTouchIconPath}`,
      );
    }

    console.log("Icon generation completed!");
  } catch (error) {
    console.error("Error converting icons:", error);
  }
}

convertIcons();
