import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get current directory
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Ensure the base icons directory exists
const baseIconsDir = path.join("public", "icons");
if (!fs.existsSync(baseIconsDir)) {
  fs.mkdirSync(baseIconsDir, { recursive: true });
}

// Create category subdirectories
const roundIconsDir = path.join(baseIconsDir, "round");
const squareIconsDir = path.join(baseIconsDir, "square");
const clearIconsDir = path.join(baseIconsDir, "clear");

// Ensure subdirectories exist
[roundIconsDir, squareIconsDir, clearIconsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Source icon files - now sourced directly from their respective subdirectories
const roundIcon = path.join(roundIconsDir, "ditto-icon.png"); // Source round icon
const squareIcon = path.join(squareIconsDir, "ditto-icon-square.png"); // Source square icon
const clearIcon = path.join(clearIconsDir, "ditto-icon-clear.png"); // Source clear icon

// Check if source files exist
const sourceIconsExist =
  fs.existsSync(roundIcon) &&
  fs.existsSync(squareIcon) &&
  fs.existsSync(clearIcon);
if (!sourceIconsExist) {
  console.error(
    "Error: One or more source icon files are missing from their respective directories.",
  );
  console.log(`Expected round icon at: ${roundIcon}`);
  console.log(`Expected square icon at: ${squareIcon}`);
  console.log(`Expected clear icon at: ${clearIcon}`);
  console.log("Please ensure these files exist before running this script.");
  process.exit(1);
}

// Generate favicon sizes from the round icon (changed from clear icon)
console.log("Generating favicon sizes from round icon...");
execSync(
  `ffmpeg -i ${roundIcon} -vf scale=16:16 ${path.join(roundIconsDir, "favicon-16x16.png")} -y`,
);
execSync(
  `ffmpeg -i ${roundIcon} -vf scale=32:32 ${path.join(roundIconsDir, "favicon-32x32.png")} -y`,
);
execSync(
  `ffmpeg -i ${roundIcon} -vf scale=64:64 ${path.join(roundIconsDir, "favicon-64x64.png")} -y`,
);

// Generate Android icon sizes from the round icon
console.log("Generating Android icon sizes from round icon...");
execSync(
  `ffmpeg -i ${roundIcon} -vf scale=192:192 ${path.join(roundIconsDir, "android-chrome-192x192.png")} -y`,
);
execSync(
  `ffmpeg -i ${roundIcon} -vf scale=512:512 ${path.join(roundIconsDir, "ditto-icon-512x512.png")} -y`,
);

// Generate clear icon variant for the DITTO_AVATAR reference in constants.ts
console.log("Generating clear icon for DITTO_AVATAR...");
execSync(
  `ffmpeg -i ${clearIcon} -vf scale=192:192 ${path.join(clearIconsDir, "ditto-icon-192x192.png")} -y`,
);

// Generate Apple touch icon sizes from the square icon
console.log("Generating Apple touch icon sizes from square icon...");
execSync(
  `ffmpeg -i ${squareIcon} -vf scale=180:180 ${path.join(squareIconsDir, "apple-touch-icon.png")} -y`,
);
execSync(
  `ffmpeg -i ${squareIcon} -vf scale=180:180 ${path.join(squareIconsDir, "apple-touch-icon-180x180.png")} -y`,
);
execSync(
  `ffmpeg -i ${squareIcon} -vf scale=167:167 ${path.join(squareIconsDir, "apple-touch-icon-167x167.png")} -y`,
);
execSync(
  `ffmpeg -i ${squareIcon} -vf scale=152:152 ${path.join(squareIconsDir, "apple-touch-icon-152x152.png")} -y`,
);
execSync(
  `ffmpeg -i ${squareIcon} -vf scale=512:512 ${path.join(squareIconsDir, "ditto-icon-512x512.png")} -y`,
);

// Try to use the installed package to create SVG
try {
  console.log("Generating mask-icon.svg from clear icon...");
  // We need to create a simple SVG from the clear icon
  // Using the installed package may not work perfectly, but we'll try
  execSync(
    `bunx png2svg ${clearIcon} ${path.join(clearIconsDir, "mask-icon.svg")}`,
  );
  console.log(
    "SVG generated successfully. You may need to edit it manually to optimize it.",
  );
} catch (error) {
  console.error("Error generating SVG:", error.message);
  console.log(
    "Please create mask-icon.svg manually or using a different tool.",
  );
}

// Generate favicon.ico using ffmpeg
console.log("\nGenerating favicon.ico using ffmpeg...");
try {
  execSync(
    `ffmpeg -i ${path.join(roundIconsDir, "favicon-16x16.png")} -i ${path.join(roundIconsDir, "favicon-32x32.png")} -filter_complex "[0]scale=16:16[16x16];[1]scale=32:32[32x32]" -map "[16x16]" -map "[32x32]" ${path.join(roundIconsDir, "favicon.ico")} -y | cat`,
  );
  console.log("favicon.ico generated successfully.");
} catch (error) {
  console.error("Error generating favicon.ico:", error.message);
  console.log(
    "If ffmpeg fails, you can use ImageMagick or an online favicon generator as an alternative.",
  );
}

console.log("\nIcon generation and organization completed!");
console.log("Icons are now organized in the following directories:");
console.log(`- ${roundIconsDir} - for round icons (Android)`);
console.log(`- ${squareIconsDir} - for square icons (Apple)`);
console.log(`- ${clearIconsDir} - for clear icons (Favicons)`);
