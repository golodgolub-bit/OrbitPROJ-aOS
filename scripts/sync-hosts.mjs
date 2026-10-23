import { cp, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
for (const host of [
  "platforms/windows/Assets/ui",
  "platforms/android/app/src/main/assets/ui",
]) {
  await mkdir(path.join(root, host), { recursive: true });
  for (const dir of ["src", "demo", "docs"])
    await cp(path.join(root, dir), path.join(root, host, dir), {
      recursive: true,
    });
  console.log(`Synced ${host}`);
}
