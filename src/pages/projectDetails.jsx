
import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import "../styles/projectDetails.css";

export default function ProjectDetails() {
  const { id: projectId } = useParams();
  const [searchParams] = useSearchParams();
  const githubUsername = searchParams.get("github") || "";
  const repoLink = searchParams.get("repo") || "";

  const [prs, setPrs] = useState([]);
  const [issues, setIssues] = useState([]);
  const [commits, setCommits] = useState([]);

  const [rawPr, setRawPr] = useState(null);
  const [rawIssues, setRawIssues] = useState(null);
  const [rawCommits, setRawCommits] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("prs");
  const [showDebug, setShowDebug] = useState(false);

  // Helper: Ensure we send **only** repo name (no URL)
  const deriveRepoName = (value) => {
    if (!value) return "";
    if (value.includes("github.com")) {
      try {
        const path = new URL(
          value.startsWith("http") ? value : "https://" + value
        ).pathname;
        const parts = path.split("/").filter(Boolean);
        return parts[1] || "";
      } catch {
        return value;
      }
    }
    return value;
  };

  const finalRepo = deriveRepoName(repoLink.trim());

  // Normalize any plausible backend response to an array
  const normalize = (json, preferredKeys) => {
    if (Array.isArray(json)) return json;
    if (json == null || typeof json !== "object") return [];
    for (const k of preferredKeys) {
      if (Array.isArray(json[k])) return json[k];
    }
    // Sometimes data nested one level deeper
    for (const k of preferredKeys) {
      if (json.data && Array.isArray(json.data[k])) return json.data[k];
    }
    return [];
  };

  useEffect(() => {
    const fetchGitHubData = async () => {
      setLoading(true);
      setError("");

      if (!githubUsername || !finalRepo) {
        setError("Missing GitHub information (owner or repository).");
        setLoading(false);
        return;
      }

      const payload = { owner: githubUsername, repoLink: finalRepo };
      const body = JSON.stringify(payload);

      const request = async (url, label) => {
        try {
            const res = await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body
            });
            if (!res.ok) {
              const text = await res.text();
              throw new Error(`${label} ${res.status}: ${text}`);
            }
            const json = await res.json();
            return json;
        } catch (err) {
          throw err;
        }
      };

      try {
        const [prJson, issuesJson, commitsJson] = await Promise.all([
          request("http://127.0.0.1:5600/github/fetchPullRequest", "PRs"),
          request("http://127.0.0.1:5600/github/fetchIssuesList", "Issues"),
          request("http://127.0.0.1:5600/github/fetchCommitHistory", "Commits")
        ]);

        setRawPr(prJson);
        setRawIssues(issuesJson);
        setRawCommits(commitsJson);

        setPrs(normalize(prJson, ["pullRequests", "prs", "data", "items"]));
        setIssues(normalize(issuesJson, ["issues", "data", "items"]));
        setCommits(normalize(commitsJson, ["commits", "data", "items"]));
      } catch (err) {
        console.error("Fetch error:", err);
        setError(err.message || "Failed to load project data.");
      } finally {
        setLoading(false);
      }
    };

    fetchGitHubData();
  }, [githubUsername, finalRepo]);

  const renderCards = (data, type) => {
    if (!data.length) {
      return (
        <div className="empty-state">
          <p>No {type} found for this repository.</p>
        </div>
      );
    }

    return data.map((item, i) => {
      const date =
        item.created_at ||
        item.updated_at ||
        item.closed_at ||
        item.commit?.author?.date ||
        Date.now();

      const title =
        item.title ||
        item.name ||
        item.commit?.message?.split("\n")[0] ||
        `${type} #${i + 1}`;

      const desc =
        type === "commits"
          ? (item.commit?.message?.split("\n").slice(1).join(" ") || "")
          : (item.body || item.description || "No description provided");

      return (
        <div className="github-card" key={item.id || item.node_id || i}>
          <div className="card-header">
            <h3>{title}</h3>
            {item.state && (
              <span className={`status-badge ${item.state.toLowerCase()}`}>
                {item.state}
              </span>
            )}
          </div>
            {desc && <p className="card-description">{desc}</p>}
          <div className="card-footer">
            {item.html_url && (
              <a
                href={item.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="github-link"
              >
                View on GitHub
              </a>
            )}
            <span className="date">{new Date(date).toLocaleDateString()}</span>
            {item.user?.login && (
              <span className="author">{item.user.login}</span>
            )}
            {item.commit?.author?.name && !item.user?.login && (
              <span className="author">{item.commit.author.name}</span>
            )}
          </div>
        </div>
      );
    });
  };

  return (
    <div className="project-details-page">
      <div className="project-header">
        <div className="breadcrumb">
          <Link to="/clientHome" className="breadcrumb-link">
            Projects
          </Link>
          <span> / </span>
          <span className="breadcrumb-current">Project Details</span>
        </div>
        <h1>
          Repository: {finalRepo}{" "}
          <small style={{ fontSize: "14px", fontWeight: 400 }}>
            ({githubUsername})
          </small>
        </h1>
        <div className="repo-meta">
          <span className="meta-item">Owner: {githubUsername}</span>
          <a
            href={`https://github.com/${githubUsername}/${finalRepo}`}
            target="_blank"
            rel="noopener noreferrer"
            className="view-repo-btn"
          >
            View Repository
          </a>
          <button
            type="button"
            className="debug-toggle-btn"
            onClick={() => setShowDebug((p) => !p)}
          >
            {showDebug ? "Hide Raw JSON" : "Show Raw JSON"}
          </button>
        </div>
      </div>

      <div className="tabs-container">
        <div className="tabs">
          <button
            className={`tab ${activeTab === "prs" ? "active" : ""}`}
            onClick={() => setActiveTab("prs")}
          >
            Pull Requests ({prs.length})
          </button>
          <button
            className={`tab ${activeTab === "issues" ? "active" : ""}`}
            onClick={() => setActiveTab("issues")}
          >
            Issues ({issues.length})
          </button>
            <button
              className={`tab ${activeTab === "commits" ? "active" : ""}`}
              onClick={() => setActiveTab("commits")}
            >
              Commits ({commits.length})
            </button>
        </div>
      </div>

      <div className="content-container">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading project data...</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <p>{error}</p>
            <Link to="/clientHome" className="back-link">
              Return to Projects
            </Link>
          </div>
        ) : (
          <div className="card-grid">
            {activeTab === "prs" && renderCards(prs, "pull requests")}
            {activeTab === "issues" && renderCards(issues, "issues")}
            {activeTab === "commits" && renderCards(commits, "commits")}
          </div>
        )}
      </div>

      {showDebug && !loading && (
        <div className="debug-panel">
          <h3>Raw JSON (debug)</h3>
          <details open>
            <summary>Pull Requests Raw</summary>
            <pre>{JSON.stringify(rawPr, null, 2)}</pre>
          </details>
          <details>
            <summary>Issues Raw</summary>
            <pre>{JSON.stringify(rawIssues, null, 2)}</pre>
          </details>
          <details>
            <summary>Commits Raw</summary>
            <pre>{JSON.stringify(rawCommits, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  );
}
