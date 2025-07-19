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

  const normalize = (json, preferredKeys) => {
    if (Array.isArray(json)) return json;
    if (json == null || typeof json !== "object") return [];
    for (const k of preferredKeys) {
      if (Array.isArray(json[k])) return json[k];
    }
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
          
          // Additional validation to ensure we got proper data
          if (!json || (typeof json === 'object' && Object.keys(json).length === 0)) {
            throw new Error(`Empty response received for ${label}`);
          }
          
          return json;
        } catch (err) {
          console.error(`API Error (${url}):`, err);
          throw new Error(`Failed to fetch ${label}: ${err.message}`);
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
        setError(err.message || "Failed to load project data. Please check your repository details and try again.");
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
          <div className="empty-state-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
            </svg>
          </div>
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
          <div className="card-inner">
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
        </div>
      );
    });
  };

  return (
    <div className="project-details-page">
      <div className="project-header">
        <div className="breadcrumb">
          <Link to="/clientHome" className="breadcrumb-link">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
            </svg>
            <span>Projects</span>
          </Link>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">Project Details</span>
        </div>
        
        <div className="repo-title-container">
          <h1>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
            </svg>
            <span>
              {finalRepo}
              <small className="repo-owner">@{githubUsername}</small>
            </span>
          </h1>
          
          <div className="repo-meta">
            <div className="meta-item">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.418 0-8-3.582-8-8s3.582-8 8-8 8 3.582 8 8-3.582 8-8 8zm1-13h-2v6h6v-2h-4z" />
              </svg>
              <span>Last fetched: {new Date().toLocaleTimeString()}</span>
            </div>
            
            <a
              href={`https://github.com/${githubUsername}/${finalRepo}`}
              target="_blank"
              rel="noopener noreferrer"
              className="view-repo-btn"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" />
              </svg>
              View Repository
            </a>
            
            <button
              type="button"
              className="debug-toggle-btn"
              onClick={() => setShowDebug((p) => !p)}
            >
              {showDebug ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                  </svg>
                  Hide Raw Data
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z" />
                  </svg>
                  Show Raw Data
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="tabs-container">
        <div className="tabs">
          <button
            className={`tab ${activeTab === "prs" ? "active" : ""}`}
            onClick={() => setActiveTab("prs")}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
            </svg>
            Pull Requests
            <span className="tab-count">{prs.length}</span>
          </button>
          <button
            className={`tab ${activeTab === "issues" ? "active" : ""}`}
            onClick={() => setActiveTab("issues")}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 8h-2.81c-.45-.78-1.07-1.45-1.82-1.96L17 4.41 15.59 3l-2.17 2.17C12.96 5.06 12.49 5 12 5c-.49 0-.96.06-1.41.17L8.41 3 7 4.41l1.62 1.63C7.88 6.55 7.26 7.22 6.81 8H4v2h2.09c-.05.33-.09.66-.09 1v1H4v2h2v1c0 .34.04.67.09 1H4v2h2.81c1.04 1.79 2.97 3 5.19 3s4.15-1.21 5.19-3H20v-2h-2.09c.05-.33.09-.66.09-1v-1h2v-2h-2v-1c0-.34-.04-.67-.09-1H20V8zm-6 8h-4v-2h4v2zm0-4h-4v-2h4v2z" />
            </svg>
            Issues
            <span className="tab-count">{issues.length}</span>
          </button>
          <button
            className={`tab ${activeTab === "commits" ? "active" : ""}`}
            onClick={() => setActiveTab("commits")}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17 3c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm-5-3c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm-5-3c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
            </svg>
            Commits
            <span className="tab-count">{commits.length}</span>
          </button>
        </div>
      </div>

      <div className="content-container">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading repository data...</p>
            <div className="loading-progress">
              <div className="progress-bar"></div>
            </div>
          </div>
        ) : error ? (
          <div className="error-state">
            <div className="error-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
            </div>
            <h3>Error Loading Data</h3>
            <p>{error}</p>
            <Link to="/clientHome" className="back-link">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
              </svg>
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
          <div className="debug-header">
            <h3>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z" />
              </svg>
              API Response Data
            </h3>
            <button 
              className="copy-json-btn"
              onClick={() => {
                const data = { prs: rawPr, issues: rawIssues, commits: rawCommits };
                navigator.clipboard.writeText(JSON.stringify(data, null, 2));
              }}
            >
              Copy All JSON
            </button>
          </div>
          
          <div className="debug-content">
            <details open>
              <summary>
                <span>Pull Requests</span>
                <span className="debug-count">{prs.length} items</span>
              </summary>
              <pre>{JSON.stringify(rawPr, null, 2)}</pre>
            </details>
            <details>
              <summary>
                <span>Issues</span>
                <span className="debug-count">{issues.length} items</span>
              </summary>
              <pre>{JSON.stringify(rawIssues, null, 2)}</pre>
            </details>
            <details>
              <summary>
                <span>Commits</span>
                <span className="debug-count">{commits.length} items</span>
              </summary>
              <pre>{JSON.stringify(rawCommits, null, 2)}</pre>
            </details>
          </div>
        </div>
      )}
    </div>
  );
}