#!/usr/bin/env node
import { VERSION } from "./version.js";

function main(argv: string[]): number {
  if (argv.includes("--version") || argv.includes("-v")) {
    console.log(VERSION);
    return 0;
  }
  console.log(`gitglance ${VERSION}\nUsage: gitglance [--version]`);
  return 0;
}

process.exitCode = main(process.argv.slice(2));
