import * as github from "@actions/github";

const MARKER = "<!-- limrun-preview -->";

function buildComment(sha: string, previewUrl: string, consoleUrl: string): string {
  return [
    "**Limrun Preview**",
    "",
    `Built from \`${sha.slice(0, 7)}\` | [Open Preview](${previewUrl})`,
    "",
    `Reviewer must be signed into [${new URL(consoleUrl).host}](${consoleUrl}) as an org member.`,
    "",
    MARKER,
  ].join("\n");
}

function buildClosedComment(): string {
  return ["**Limrun Preview**", "", "Preview removed. This PR is closed.", "", MARKER].join("\n");
}

async function findComment(
  octokit: ReturnType<typeof github.getOctokit>,
  owner: string,
  repo: string,
  prNumber: number
): Promise<number | null> {
  for await (const { data: comments } of octokit.paginate.iterator(
    octokit.rest.issues.listComments,
    { owner, repo, issue_number: prNumber, per_page: 100 }
  )) {
    for (const comment of comments) {
      if (comment.body?.includes(MARKER)) {
        return comment.id;
      }
    }
  }
  return null;
}

export async function postOrUpdateComment(
  token: string,
  owner: string,
  repo: string,
  prNumber: number,
  sha: string,
  previewUrl: string,
  consoleUrl: string
): Promise<void> {
  const octokit = github.getOctokit(token);
  const body = buildComment(sha, previewUrl, consoleUrl);
  const existingId = await findComment(octokit, owner, repo, prNumber);

  if (existingId) {
    await octokit.rest.issues.updateComment({ owner, repo, comment_id: existingId, body });
  } else {
    await octokit.rest.issues.createComment({ owner, repo, issue_number: prNumber, body });
  }
}

export async function updateCommentClosed(
  token: string,
  owner: string,
  repo: string,
  prNumber: number
): Promise<void> {
  const octokit = github.getOctokit(token);
  const existingId = await findComment(octokit, owner, repo, prNumber);
  if (existingId) {
    await octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: existingId,
      body: buildClosedComment(),
    });
  }
}
