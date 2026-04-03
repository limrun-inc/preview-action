import * as core from "@actions/core";
import * as github from "@actions/github";
import Limrun from "@limrun/api";
import { existsSync, statSync } from "fs";
import { uploadAsset, deleteAsset } from "./upload";
import { postOrUpdateComment, updateCommentClosed } from "./comment";

async function run(): Promise<void> {
  const apiKey = core.getInput("api-key", { required: true });
  core.setSecret(apiKey);
  const consoleUrl = process.env.LIMRUN_CONSOLE_URL || "https://console.limrun.com";
  const platform = core.getInput("platform");
  const ghToken = core.getInput("github-token");
  const client = new Limrun({ apiKey });

  if (!["ios", "android"].includes(platform)) {
    core.setFailed(`Invalid platform "${platform}". Must be "ios" or "android".`);
    return;
  }

  const { payload } = github.context;
  const pr = payload.pull_request;
  if (!pr) {
    core.setFailed("This action only works on pull_request events.");
    return;
  }

  const owner = github.context.repo.owner;
  const repo = github.context.repo.repo;
  const prNumber = pr.number;
  const sha = pr.head.sha;
  const action = payload.action;

  const assetName = `preview/${owner}/${repo}/pr-${prNumber}`;
  if (assetName.includes("..")) {
    core.setFailed("Asset name must not contain '..'");
    return;
  }

  if (action === "closed") {
    core.info("PR closed, cleaning up asset...");
    try {
      await deleteAsset(client, assetName);
    } catch (err) {
      core.warning(`Failed to delete asset: ${err}`);
    }
    if (ghToken) {
      try {
        await updateCommentClosed(ghToken, owner, repo, prNumber);
      } catch (err) {
        core.warning(`Failed to update comment: ${err}`);
      }
    }
    return;
  }

  if (!["opened", "synchronize", "reopened"].includes(action as string)) {
    core.info(`Ignoring PR action "${action}", nothing to do.`);
    return;
  }

  // opened, synchronize, reopened: upload and comment
  const appPath = core.getInput("app-path");
  if (!appPath) {
    core.setFailed("app-path is required for non-closed PR events.");
    return;
  }
  if (!existsSync(appPath)) {
    core.setFailed(`app-path "${appPath}" does not exist.`);
    return;
  }
  if (platform === "ios" && !statSync(appPath).isDirectory()) {
    core.setFailed(`app-path "${appPath}" must be a directory for iOS (.app bundle).`);
    return;
  }
  if (platform === "android" && !statSync(appPath).isFile()) {
    core.setFailed(`app-path "${appPath}" must be a file for Android (.apk or .aab).`);
    return;
  }

  core.info(`Uploading ${appPath} as ${assetName}...`);
  const asset = await uploadAsset(client, appPath, assetName);
  core.info(`Asset uploaded: ${asset.id}`);

  const previewUrl = `${consoleUrl}/preview?asset=${encodeURIComponent(assetName)}&platform=${platform}`;
  core.info(`Preview URL: ${previewUrl}`);
  core.setOutput("preview-url", previewUrl);
  core.setOutput("asset-id", asset.id);
  core.setOutput("asset-name", assetName);

  if (ghToken) {
    try {
      await postOrUpdateComment(ghToken, owner, repo, prNumber, sha, previewUrl, consoleUrl);
      core.info("PR comment posted.");
    } catch (err) {
      core.warning(`Failed to post comment: ${err}`);
    }
  } else {
    core.warning("github-token not available, skipping PR comment.");
  }
}

run().catch((err) => core.setFailed(err instanceof Error ? err.message : String(err)));
