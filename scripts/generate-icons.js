import { execSync } from "child_process"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

// Get current directory
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Ensure the base icons directory exists
const baseIconsDir = path.join("public", "icons")
if (!fs.existsSync(baseIconsDir)) {
  fs.mkdirSync(baseIconsDir, { recursive: true })
}

// Create category subdirectories
const roundIconsDir = path.join(baseIconsDir, "round")
const squareIconsDir = path.join(baseIconsDir, "square")
const clearIconsDir = path.join(baseIconsDir, "clear")

// Ensure subdirectories exist
;[roundIconsDir, squareIconsDir, clearIconsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
})

// Single source of truth: the ultimate HeyDitto icon-words combo
const originalsDir = path.join("public", "assets", "originals")
const ultimateSource = path.join(originalsDir, "heyditto-icon-words.png")
const originalUserAvatar = path.join(originalsDir, "user-avatar.png")
const originalDittoAvatar = path.join(originalsDir, "ditto-avatar.png")
const originalNotFound = path.join(originalsDir, "not-found.png")
const originalImageLoading = path.join(originalsDir, "image-loading.png")

// Check if the ultimate source exists
if (!fs.existsSync(ultimateSource)) {
  console.error(`Error: Ultimate source file missing: ${ultimateSource}`)
  console.log(
    "Please ensure the heyditto-icon-words.png file exists before running this script."
  )
  process.exit(1)
}

console.log(`🎯 Using ultimate high-quality source: ${ultimateSource}`)

// Original ditto icon source for existing icons
const originalDittoIcon = path.join(originalsDir, "ditto-icon.png")

// Generate favicon sizes from the original ditto icon
console.log("Generating favicon sizes from original ditto icon...")
execSync(
  `ffmpeg -i ${originalDittoIcon} -vf scale=16:16:flags=lanczos ${path.join(roundIconsDir, "favicon-16x16.png")} -y`
)
execSync(
  `ffmpeg -i ${originalDittoIcon} -vf scale=32:32:flags=lanczos ${path.join(roundIconsDir, "favicon-32x32.png")} -y`
)
execSync(
  `ffmpeg -i ${originalDittoIcon} -vf scale=64:64:flags=lanczos ${path.join(roundIconsDir, "favicon-64x64.png")} -y`
)

// Generate Android icon sizes from the original ditto icon
console.log("Generating Android icon sizes from original ditto icon...")
execSync(
  `ffmpeg -i ${originalDittoIcon} -vf scale=192:192:flags=lanczos ${path.join(roundIconsDir, "android-chrome-192x192.png")} -y`
)
execSync(
  `ffmpeg -i ${originalDittoIcon} -vf scale=512:512:flags=lanczos ${path.join(roundIconsDir, "ditto-icon-512x512.png")} -y`
)

// Generate 192x192 user-avatar and ditto-avatar from originals
console.log("Generating 192x192 user-avatar and ditto-avatar from originals...")
const userAvatarOut = path.join(roundIconsDir, "user-avatar-192x192.png")
const dittoAvatarOut = path.join(roundIconsDir, "ditto-avatar-192x192.png")
if (fs.existsSync(originalUserAvatar)) {
  execSync(
    `ffmpeg -i ${originalUserAvatar} -vf scale=192:192 ${userAvatarOut} -y`
  )
  console.log(`Generated: ${userAvatarOut}`)
} else {
  console.warn(`Warning: user-avatar source not found at ${originalUserAvatar}`)
}
if (fs.existsSync(originalDittoAvatar)) {
  execSync(
    `ffmpeg -i ${originalDittoAvatar} -vf scale=192:192 ${dittoAvatarOut} -y`
  )
  console.log(`Generated: ${dittoAvatarOut}`)
} else {
  console.warn(
    `Warning: ditto-avatar source not found at ${originalDittoAvatar}`
  )
}

// Original sources for existing icons
const originalDittoClear = path.join(originalsDir, "ditto-icon-clear.png")
const originalDittoSquare = path.join(originalsDir, "ditto-icon-square.png")

// Generate clear icon variant for the DITTO_AVATAR reference in constants.ts
console.log("Generating clear icon from original clear source...")
execSync(
  `ffmpeg -i ${originalDittoClear} -vf scale=192:192:flags=lanczos ${path.join(clearIconsDir, "ditto-icon-192x192.png")} -y`
)

// Generate Apple touch icon sizes from the original square source
console.log("Generating Apple touch icon sizes from original square source...")
execSync(
  `ffmpeg -i ${originalDittoSquare} -vf scale=180:180:flags=lanczos ${path.join(squareIconsDir, "apple-touch-icon.png")} -y`
)
execSync(
  `ffmpeg -i ${originalDittoSquare} -vf scale=180:180:flags=lanczos ${path.join(squareIconsDir, "apple-touch-icon-180x180.png")} -y`
)
execSync(
  `ffmpeg -i ${originalDittoSquare} -vf scale=167:167:flags=lanczos ${path.join(squareIconsDir, "apple-touch-icon-167x167.png")} -y`
)
execSync(
  `ffmpeg -i ${originalDittoSquare} -vf scale=152:152:flags=lanczos ${path.join(squareIconsDir, "apple-touch-icon-152x152.png")} -y`
)
execSync(
  `ffmpeg -i ${originalDittoSquare} -vf scale=512:512:flags=lanczos ${path.join(squareIconsDir, "ditto-icon-512x512.png")} -y`
)

// Try to use the installed package to create SVG from original clear source
try {
  console.log("Generating mask-icon.svg from original clear source...")
  execSync(
    `bunx png2svg ${originalDittoClear} ${path.join(clearIconsDir, "mask-icon.svg")}`
  )
  console.log(
    "SVG generated successfully. You may need to edit it manually to optimize it."
  )
} catch (error) {
  console.error("Error generating SVG:", error.message)
  console.log("Please create mask-icon.svg manually or using a different tool.")
}

// Generate favicon.ico using ffmpeg
console.log("\nGenerating favicon.ico using ffmpeg...")
try {
  execSync(
    `ffmpeg -i ${path.join(roundIconsDir, "favicon-16x16.png")} -i ${path.join(roundIconsDir, "favicon-32x32.png")} -filter_complex "[0]scale=16:16[16x16];[1]scale=32:32[32x32]" -map "[16x16]" -map "[32x32]" ${path.join(roundIconsDir, "favicon.ico")} -y | cat`
  )
  console.log("favicon.ico generated successfully.")
} catch (error) {
  console.error("Error generating favicon.ico:", error.message)
  console.log(
    "If ffmpeg fails, you can use ImageMagick or an online favicon generator as an alternative."
  )
}

// Generate 192x192 placeholder images from originals
console.log("Generating 192x192 placeholder images from originals...")
const placeholdersDir = path.join("public", "placeholders")
if (!fs.existsSync(placeholdersDir)) {
  fs.mkdirSync(placeholdersDir, { recursive: true })
}
const placeholderImages = [
  {
    src: originalNotFound,
    out: path.join(placeholdersDir, "not-found-192.png"),
  },
  {
    src: originalImageLoading,
    out: path.join(placeholdersDir, "image-loading-192.png"),
  },
]
placeholderImages.forEach(({ src, out }) => {
  if (fs.existsSync(src)) {
    execSync(`ffmpeg -i ${src} -vf scale=192:192 ${out} -y`)
    console.log(`Generated: ${out}`)
  } else {
    console.warn(`Warning: placeholder source not found at ${src}`)
  }
})

// Generate HeyDitto logo sizes from the ultimate source
console.log("Generating HeyDitto logo sizes from ultimate source...")
const logosDir = path.join("public", "assets", "logos")
if (!fs.existsSync(logosDir)) {
  fs.mkdirSync(logosDir, { recursive: true })
}

// Generate at different heights while maintaining aspect ratio for sharp display
const logoHeights = [
  { height: 32, suffix: "32" },
  { height: 48, suffix: "48" },
  { height: 64, suffix: "64" },
  { height: 96, suffix: "96" },
  { height: 128, suffix: "128" },
  { height: 256, suffix: "256" },
]

logoHeights.forEach(({ height, suffix }) => {
  const outputPath = path.join(logosDir, `heyditto-icon-words-${suffix}.png`)

  // Use high-quality Lanczos scaling to maintain sharpness
  execSync(
    `ffmpeg -i ${ultimateSource} -vf scale=-1:${height}:flags=lanczos ${outputPath} -y`
  )
  console.log(`Generated: ${outputPath}`)
})

console.log(
  "\n✨ Icon generation completed using ultimate high-quality source!"
)
console.log("🎯 All icons generated from:", ultimateSource)
console.log("\nGenerated icons are organized in:")
console.log(`- ${roundIconsDir} - Android icons & favicons`)
console.log(`- ${squareIconsDir} - Apple touch icons`)
console.log(`- ${clearIconsDir} - Clear background variants`)
console.log(`- ${logosDir} - Logo variants for UI components`)
console.log(`- ${originalsDir} - Original source images`)
console.log("\n🚀 Your beautiful HeyDitto branding is ready to shine!")
