// Files anonymous issue reports into GitHub Issues on the reporter's behalf.
// GITHUB_TOKEN is read only from process.env (set via deploy/.env in
// production) and never touches the request/response cycle with the
// browser - the reporter never needs a GitHub account or sees this token.
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO;

export async function fileIssue({ title, body }) {
  if (!GITHUB_TOKEN || GITHUB_TOKEN === 'changeme') {
    throw new Error('GITHUB_TOKEN is not configured');
  }
  if (!GITHUB_REPO) {
    throw new Error('GITHUB_REPO is not configured');
  }

  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({ title, body, labels: ['user-reported'] }),
  });

  if (!res.ok) {
    throw new Error(`GitHub issue creation failed: ${res.status} ${await res.text()}`);
  }

  return res.json();
}
