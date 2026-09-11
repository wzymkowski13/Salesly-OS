const GITHUB_API = "https://api.github.com";
const PF_OWNER = "wzymkowski13";
const PF_REPO = "pf";
export const PF_WORKFLOW = "scraper.yml";
export const PF_REF = "main";

export type LeadFactorySource = "companies" | "jdg";
export type LeadFactoryMode = "fast" | "deep";

export type PfRun = {
  id: number;
  run_number: number;
  status: "queued" | "in_progress" | "completed" | string;
  conclusion: string | null;
  created_at: string;
  updated_at: string;
  html_url: string;
  display_title?: string;
  name?: string;
};

function token() {
  const value = process.env.GITHUB_ACTIONS_TOKEN;
  if (!value) throw new Error("Brak GITHUB_ACTIONS_TOKEN po stronie serwera.");
  return value;
}

async function github(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/vnd.github+json");
  headers.set("Authorization", `Bearer ${token()}`);
  headers.set("X-GitHub-Api-Version", "2022-11-28");

  const response = await fetch(`${GITHUB_API}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub API ${response.status}: ${body || response.statusText}`);
  }

  return response;
}

export function buildDispatchInputs({
  source,
  target,
  mode,
  includePublic,
  requestId,
}: {
  source: LeadFactorySource;
  target: number;
  mode: LeadFactoryMode;
  includePublic: boolean;
  requestId: string;
}) {
  if (!Number.isInteger(target) || target < 1 || target > 500) {
    throw new Error("Target jednego runu musi mieścić się w zakresie 1-500.");
  }
  if (source === "jdg" && mode === "deep") {
    throw new Error("Profil JDG nie obsługuje trybu Deep.");
  }

  return {
    campaign_profile: source === "companies" ? "10plus" : "jdg",
    operation: mode === "deep" ? "deepen" : "collect",
    // UI steruje wielkością tej partii. Łączny limit kampanii zostawiamy wysoko,
    // aby kolejne uruchomienia nie stawały się no-op po przekroczeniu 100/200/500.
    campaign_target: "5000",
    batch_target: String(target),
    new_campaign: false,
    reset_sources: false,
    include_public: source === "companies" && includePublic,
    public_share: "20",
    request_id: requestId,
  };
}

export async function dispatchPfWorkflow(inputs: Record<string, string | boolean>) {
  await github(`/repos/${PF_OWNER}/${PF_REPO}/actions/workflows/${PF_WORKFLOW}/dispatches`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ref: PF_REF, inputs }),
  });
}

export async function findRunByRequestId(requestId: string): Promise<PfRun | null> {
  const response = await github(
    `/repos/${PF_OWNER}/${PF_REPO}/actions/workflows/${PF_WORKFLOW}/runs?event=workflow_dispatch&branch=${PF_REF}&per_page=30`,
  );
  const data = (await response.json()) as { workflow_runs?: PfRun[] };
  return (data.workflow_runs || []).find((run) =>
    (run.display_title || run.name || "").includes(requestId),
  ) || null;
}

export async function listRecentPfRuns(): Promise<PfRun[]> {
  const response = await github(
    `/repos/${PF_OWNER}/${PF_REPO}/actions/workflows/${PF_WORKFLOW}/runs?per_page=10`,
  );
  const data = (await response.json()) as { workflow_runs?: PfRun[] };
  return data.workflow_runs || [];
}

export async function getRunArtifacts(runId: number) {
  const response = await github(`/repos/${PF_OWNER}/${PF_REPO}/actions/runs/${runId}/artifacts?per_page=20`);
  const data = (await response.json()) as {
    artifacts?: Array<{ id: number; name: string; expired: boolean; size_in_bytes: number }>;
  };
  return data.artifacts || [];
}

export async function getArtifactRedirect(artifactId: number) {
  const response = await fetch(
    `${GITHUB_API}/repos/${PF_OWNER}/${PF_REPO}/actions/artifacts/${artifactId}/zip`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token()}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
      redirect: "manual",
      cache: "no-store",
    },
  );

  if (![301, 302, 303, 307, 308].includes(response.status)) {
    const body = await response.text();
    throw new Error(`GitHub artifact ${response.status}: ${body || response.statusText}`);
  }
  const location = response.headers.get("location");
  if (!location) throw new Error("GitHub nie zwrócił adresu pobrania artefaktu.");
  return location;
}
