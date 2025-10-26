import { serve } from "bun";
import index from "./index.html";
import { spawn } from "child_process";
import { readFile } from "fs/promises";
import "dotenv/config";

const FEED_PATH = `${process.env.STATE_DIRECTORY}/feed.xml`

const update = async function() {
  const FEED_URL = process.env.FEED_URL || await readFile(process.env.FEED_URL_FILE, "utf8");

  try {
    await new Promise((resolve, reject) => {
      const child = spawn("feed-updater.py", [FEED_URL, FEED_PATH], {stdio: "inherit", cwd: process.env.STATE_DIRECTORY});
      child.on("error", reject);
      child.on("close", resolve);
    });
  } catch (err) {
    console.error(`feed-updater failed: ${err}`);
  }
  setTimeout(update, 15 * 60 * 1000);
}
update();

const server = serve({
  hostname: "127.0.0.1",
  port: process.env.PORT || 3447,
  routes: {
    "/": index,
    "/feed.xml": () => new Response(Bun.file(FEED_PATH)),
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`Server running at ${server.url}`);
