import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/ClientHome.css";

export default function ClientHome() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newProject, setNewProject] = useState({
    projectName: "",
    projectDescription: "",
    githubRepoUrl: "",
    timeLines: "",
  });
  const [formErrors, setFormErrors] = useState({});

  const getClientIdFromToken = () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Token not found");
      const payload = token.split(".")[1];
      const decodedPayload = JSON.parse(atob(payload));
      return decodedPayload.id;
    } catch (err) {
      throw new Error("Invalid token");
    }
  };

  const extractOwnerAndRepo = (url) => {
    try {
      const pathParts = new URL(url).pathname.split("/").filter(Boolean);
      const owner = pathParts[0];
      const repo = pathParts[1];
      return { owner, repo };
    } catch (err) {
      console.error("Invalid GitHub URL:", url);
      return { owner: "", repo: "" };
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setIsLoading(true);
    let clientId = "";

    try {
      clientId = getClientIdFromToken();
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(
        `{VITE_BACKEND_BASE_URL}/api/fetchProjectwrtClient?clientId=${clientId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to fetch projects");
      }

      setProjects(data.projects || data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewProject({
      ...newProject,
      [name]: value,
    });
  };

  const validateForm = () => {
    const errors = {};
    if (!newProject.projectName.trim()) {
      errors.projectName = "Project name is required";
    }
    if (!newProject.projectDescription.trim()) {
      errors.projectDescription = "Project description is required";
    }
    if (!newProject.githubRepoUrl.trim()) {
      errors.githubRepoUrl = "GitHub URL is required";
    } else if (!isValidGitHubUrl(newProject.githubRepoUrl)) {
      errors.githubRepoUrl = "Please enter a valid GitHub repository URL";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const isValidGitHubUrl = (url) => {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.hostname === "github.com" && parsedUrl.pathname.split("/").filter(Boolean).length >= 2;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Token not found");

      const res = await fetch(`${import.meta.env.VITE_BACKEND_BASE_URL}/api/projectRegistration`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          projectName: newProject.projectName,
          projectDescription: newProject.projectDescription,
          githubRepoUrl: newProject.githubRepoUrl,
          timeLines: newProject.timeLines,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to create project");
      }

      setShowModal(false);
      setNewProject({
        projectName: "",
        projectDescription: "",
        githubRepoUrl: "",
        timeLines: "",
      });
      fetchProjects();
    } catch (err) {
      setError(err.message);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      active: { color: "bg-gradient-to-r from-emerald-400 to-teal-500", text: "Active" },
      completed: { color: "bg-gradient-to-r from-blue-400 to-indigo-500", text: "Completed" },
      pending: { color: "bg-gradient-to-r from-amber-400 to-yellow-500", text: "Pending" },
      cancelled: { color: "bg-gradient-to-r from-rose-400 to-pink-500", text: "Cancelled" },
    };

    const statusInfo =
      statusMap[status.toLowerCase()] || {
        color: "bg-gradient-to-r from-gray-400 to-slate-500",
        text: status,
      };

    return (
      <span className={`text-xs font-semibold px-3 py-1 rounded-full text-white ${statusInfo.color} shadow-md`}>
        {statusInfo.text}
      </span>
    );
  };

  return (
    <div className="client-home-container bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <header className="client-header">
        <div className="header-content">
          <h1 className="client-title">Your Projects</h1>
          <p className="client-subtitle">Manage and track your active projects</p>
        </div>
        <button
          className="add-project-btn"
          onClick={() => setShowModal(true)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </svg>
          Add Project
        </button>
      </header>

      {error && (
        <div className="client-error">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading your projects...</p>
        </div>
      ) : (
        <div className="projects-grid">
          {projects.length > 0 ? (
            projects.map((project) => (
              <div 
                className="project-card"
                key={project._id || project.projectName}
                style={{
                  transformStyle: 'preserve-3d',
                  transform: 'perspective(1000px)'
                }}
              >
                <div className="project-card-inner">
                  <div className="project-card-header">
                    <h3 className="project-name">{project.projectName}</h3>
                    {project.projectStatus && getStatusBadge(project.projectStatus)}
                  </div>

                  <p className="project-description">
                    {project.projectDescription || "No description provided"}
                  </p>

                  <div className="project-details">
                    {project.githubRepoUrl && (
                      <div className="project-detail">
                        <svg className="github-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                        </svg>
                        <a
                          href={project.githubRepoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="github-link"
                        >
                          {project.githubRepoUrl.replace("https://github.com/", "")}
                        </a>
                      </div>
                    )}

                    <div className="project-detail">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z" />
                      </svg>
                      <span>
                        Created:{" "}
                        {new Date(project.createdAt || Date.now()).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {project.githubRepoUrl && (
                    <button
                      className="view-project-btn"
                      onClick={() => {
                        const { owner, repo } = extractOwnerAndRepo(project.githubRepoUrl);
                        navigate(
                          `/project/${project._id}?github=${owner}&repo=${encodeURIComponent(repo)}`
                        );
                      }}
                    >
                      View Project Details
                      <span className="btn-shine"></span>
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="no-projects">
              <div className="no-projects-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
                </svg>
              </div>
              <p>No projects found</p>
              <button 
                className="create-project-btn"
                onClick={() => setShowModal(true)}
              >
                Create New Project
                <span className="btn-shine"></span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add Project Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h2>Create New Project</h2>
              <button
                className="modal-close-btn"
                onClick={() => {
                  setShowModal(false);
                  setFormErrors({});
                }}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label htmlFor="projectName">Project Name*</label>
                <input
                  type="text"
                  id="projectName"
                  name="projectName"
                  value={newProject.projectName}
                  onChange={handleInputChange}
                  placeholder="Enter project name"
                  className={formErrors.projectName ? 'input-error' : ''}
                />
                {formErrors.projectName && (
                  <span className="form-error">{formErrors.projectName}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="projectDescription">Project Description*</label>
                <textarea
                  id="projectDescription"
                  name="projectDescription"
                  value={newProject.projectDescription}
                  onChange={handleInputChange}
                  placeholder="Enter project description"
                  rows="4"
                  className={formErrors.projectDescription ? 'input-error' : ''}
                />
                {formErrors.projectDescription && (
                  <span className="form-error">{formErrors.projectDescription}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="githubRepoUrl">GitHub Repository URL*</label>
                <input
                  type="url"
                  id="githubRepoUrl"
                  name="githubRepoUrl"
                  value={newProject.githubRepoUrl}
                  onChange={handleInputChange}
                  placeholder="https://github.com/username/repository"
                  className={formErrors.githubRepoUrl ? 'input-error' : ''}
                />
                {formErrors.githubRepoUrl && (
                  <span className="form-error">{formErrors.githubRepoUrl}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="timeLines">Timelines (Optional)</label>
                <input
                  type="text"
                  id="timeLines"
                  name="timeLines"
                  value={newProject.timeLines}
                  onChange={handleInputChange}
                  placeholder="e.g., 2 weeks, 1 month"
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => {
                    setShowModal(false);
                    setFormErrors({});
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  Create Project
                  <span className="btn-shine"></span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}