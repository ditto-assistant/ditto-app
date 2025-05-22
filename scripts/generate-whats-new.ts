#!/usr/bin/env bun
import { readFileSync, writeFileSync, existsSync } from "fs"
import { join } from "path"

// Read the current version from package.json
const packageJson = JSON.parse(readFileSync("./package.json", "utf-8"))
const version = packageJson.version

// Convert version to component name format (e.g., 0.11.62 -> V0_11_62)
const componentName = `V${version.replace(/\./g, "_")}`
const fileName = `${componentName}.tsx`

// Paths
const versionsDir = "./src/components/WhatsNew/versions"
const targetPath = join(versionsDir, fileName)

// Check if version file already exists
if (existsSync(targetPath)) {
  console.error(`Version file ${fileName} already exists!`)
  process.exit(1)
}

// Template for the new version component
const versionTemplate = `import React from "react";
import { VersionSection, Section } from "./VersionTemplate";

const sections: Section[] = [
  {
    title: "New Features",
    features: [
      {
        type: "new",
        title: "New Feature",
        description: "Description of the new feature",
      },
    ],
  },
  {
    title: "Improvements",
    features: [
      {
        type: "improved",
        title: "Improvement",
        description: "Description of the improvement",
      },
    ],
  },
  {
    title: "Bug Fixes",
    features: [
      {
        type: "fixed",
        title: "Bug Fix",
        description: "Description of the bug fix",
      },
    ],
  },
];

const ${componentName} = () => (
  <div>
    {sections.map((section, index) => (
      <VersionSection key={index} {...section} />
    ))}
  </div>
);

export default ${componentName};
`

// Write the new version file
writeFileSync(targetPath, versionTemplate)

console.log(
  `The WhatsNew component now uses dynamic imports for version components.`
)
console.log(`No need to update imports or version map in WhatsNew.tsx.`)

console.log(`✨ Generated What's New template for version ${version}:`)
console.log(`📝 Created: ${targetPath}`)
console.log("\n⚠️  Remember to update the template with actual release notes!")
