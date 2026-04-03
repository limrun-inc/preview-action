import * as core from "@actions/core";
import Limrun from "@limrun/api";
import { execFileSync } from "child_process";
import { statSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join, dirname, basename } from "path";

const MAX_SIZE_BYTES = 500 * 1024 * 1024; // 500MB

interface UploadResult {
  id: string;
  name: string;
}

export async function uploadAsset(
  client: Limrun,
  appPath: string,
  assetName: string
): Promise<UploadResult> {
  const tarPath = join(tmpdir(), `limrun-preview-${Date.now()}.tar.gz`);
  try {
    execFileSync("tar", ["-czf", tarPath, "-C", dirname(appPath), basename(appPath)]);

    const { size } = statSync(tarPath);
    if (size > MAX_SIZE_BYTES) {
      throw new Error(`Archive is ${Math.round(size / 1024 / 1024)}MB, exceeds 500MB limit`);
    }

    const asset = await client.assets.getOrUpload({ path: tarPath, name: assetName });
    return { id: asset.id, name: asset.name };
  } finally {
    try {
      unlinkSync(tarPath);
    } catch {
      // ignore cleanup errors
    }
  }
}

export async function deleteAsset(client: Limrun, assetName: string): Promise<void> {
  const assets = await client.assets.list({ nameFilter: assetName });
  const match = assets.find((a) => a.name === assetName);
  if (!match) return;
  await client.assets.delete(match.id);
}
