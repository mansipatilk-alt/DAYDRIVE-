import { useEffect, useMemo, useState } from "react";
import "./App.css";

function getToday() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getRelativeDate(offset) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDueDate(due) {
  if (!due) return "No due date";

  if (due === "Today") return "Today";
  if (due === "Tomorrow") return "Tomorrow";

  const date = new Date(`${due}T00:00:00`);

  if (Number.isNaN(date.getTime())) return due;

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function App() {
  const API_URL = "http://localhost:5000/api/tasks";

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");

  const [filter, setFilter] = useState("All Tasks");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("Personal");
  const [newPriority, setNewPriority] = useState("Medium");
  const [newDue, setNewDue] = useState(getToday());

  function normalizeTask(task) {
    const backendDue = task.dueDate ?? task.due ?? "";

    return {
      ...task,
      due:
        backendDue === "Today"
          ? getToday()
          : backendDue === "Tomorrow"
            ? getRelativeDate(1)
            : backendDue,
    };
  }

  async function loadTasks() {
    try {
      setApiError("");
      const response = await fetch(API_URL);

      if (!response.ok) {
        throw new Error("Unable to load tasks from the server.");
      }

      const data = await response.json();
      setTasks(Array.isArray(data) ? data.map(normalizeTask) : []);
    } catch (error) {
      console.error("Unable to load tasks:", error);
      setApiError("Could not connect to the DayDrive backend. Make sure the server is running on port 5000.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTasks();
  }, []);

  const visibleTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch = task.title
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesFilter =
        filter === "All Tasks" ||
        (filter === "Completed" && task.completed) ||
        (filter === "Pending" && !task.completed) ||
        task.category === filter;

      return matchesSearch && matchesFilter;
    });
  }, [tasks, filter, search]);

  const completedCount = tasks.filter((task) => task.completed).length;
  const progress = tasks.length
    ? Math.round((completedCount / tasks.length) * 100)
    : 0;

  function resetForm() {
    setNewTitle("");
    setNewCategory("Personal");
    setNewPriority("Medium");
    setNewDue(getToday());
    setEditingId(null);
    setShowForm(false);
  }

  function openAddForm() {
    setNewTitle("");
    setNewCategory("Personal");
    setNewPriority("Medium");
    setNewDue(getToday());
    setEditingId(null);
    setShowForm(true);
  }

  function openEditForm(task) {
    setEditingId(task.id);
    setNewTitle(task.title);
    setNewCategory(task.category);
    setNewPriority(task.priority);
    setNewDue(task.due || "");
    setShowForm(true);
  }

  async function saveTask(event) {
    event.preventDefault();

    if (!newTitle.trim()) return;

    const taskData = {
      title: newTitle.trim(),
      category: newCategory,
      priority: newPriority,
      dueDate: newDue,
    };

    try {
      setApiError("");

      const response =
        editingId !== null
          ? await fetch(`${API_URL}/${editingId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(taskData),
            })
          : await fetch(API_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(taskData),
            });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to save the task.");
      }

      if (editingId !== null) {
        setTasks((current) =>
          current.map((task) =>
            task.id === editingId ? normalizeTask(result) : task
          )
        );
      } else {
        setTasks((current) => [normalizeTask(result), ...current]);
      }

      resetForm();
      setFilter("All Tasks");
    } catch (error) {
      console.error("Unable to save task:", error);
      setApiError(error.message || "Unable to save the task. Please try again.");
    }
  }

  async function toggleTask(id) {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;

    try {
      setApiError("");
      const response = await fetch(`${API_URL}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !task.completed }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to update the task.");
      }

      setTasks((current) =>
        current.map((item) => (item.id === id ? normalizeTask(result) : item))
      );
    } catch (error) {
      console.error("Unable to update task:", error);
      setApiError(error.message || "Unable to update the task. Please try again.");
    }
  }

  async function deleteTask(id) {
    try {
      setApiError("");
      const response = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to delete the task.");
      }

      setTasks((current) => current.filter((task) => task.id !== id));

      if (editingId === id) {
        resetForm();
      }
    } catch (error) {
      console.error("Unable to delete task:", error);
      setApiError(error.message || "Unable to delete the task. Please try again.");
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#home">
          <span className="brand-icon">✓</span>
          <span className="brand-text">
            <span className="brand-name">
              DAYDRIVE 
            </span>
            <span className="brand-tagline">Make Today Count.</span>
          </span>
        </a>

        <p className="nav-label">WORKSPACE</p>

        <nav className="navigation">
          {[
            ["All Tasks", "▦"],
            ["Pending", "◷"],
            ["Completed", "✓"],
          ].map(([name, icon]) => (
            <button
              key={name}
              className={`nav-item ${filter === name ? "active" : ""}`}
              onClick={() => setFilter(name)}
            >
              <span>{icon}</span>
              {name}
              {name === "All Tasks" && (
                <span className="nav-count">{tasks.length}</span>
              )}
            </button>
          ))}
        </nav>

        <p className="nav-label category-label">CATEGORIES</p>

        <nav className="navigation">
          {[
            ["Work", "💼"],
            ["Study", "📚"],
            ["Personal", "☕"],
          ].map(([name, icon]) => (
            <button
              key={name}
              className={`nav-item ${filter === name ? "active" : ""}`}
              onClick={() => setFilter(name)}
            >
              <span>{icon}</span>
              {name}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="focus-card">
            <span className="focus-sparkle">✦</span>
            <h3>Stay focused!</h3>
            <p>Small steps every day lead to big results.</p>
          </div>

          <div className="profile">
            <div className="avatar">M</div>
            <div>
              <strong>My Workspace</strong>
              <span>Personal account</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="main-content" id="home">
        <header className="topbar">
          <div>
            <p className="eyebrow">YOUR PERSONAL WORKSPACE</p>
            <h1>
              Good things take <span>focus.</span>
            </h1>
            <p className="subtitle">
              Make Today Count. One task at a time.
            </p>
          </div>

          <button
            className="primary-button top-add"
            onClick={openAddForm}
          >
            <span>＋</span> Add new task
          </button>
        </header>

        <section className="stats-grid">
          <article className="stat-card">
            <div className="stat-top">
              <span>Total tasks</span>
              <span className="stat-icon lavender">▦</span>
            </div>
            <strong>{tasks.length}</strong>
            <p>Tasks in your workspace</p>
          </article>

          <article className="stat-card">
            <div className="stat-top">
              <span>Completed</span>
              <span className="stat-icon mint">✓</span>
            </div>
            <strong>{completedCount}</strong>
            <p>Look at you go!</p>
          </article>

          <article className="stat-card">
            <div className="stat-top">
              <span>Pending</span>
              <span className="stat-icon peach">◷</span>
            </div>
            <strong>{tasks.length - completedCount}</strong>
            <p>One step at a time</p>
          </article>

          <article className="stat-card progress-stat">
            <div className="stat-top">
              <span>Progress</span>
              <span className="stat-icon blue">↗</span>
            </div>
            <strong>{progress}%</strong>
            <div className="progress-track">
              <div style={{ width: `${progress}%` }} />
            </div>
          </article>
        </section>

        {showForm && (
          <form className="task-form" onSubmit={saveTask}>
            <div className="form-heading">
              <div>
                <h2>
                  {editingId !== null ? "Edit task" : "Create a task"}
                </h2>
                <p>
                  {editingId !== null
                    ? "Update your task details."
                    : "Add something you want to get done."}
                </p>
              </div>

              <button
                type="button"
                className="close-button"
                onClick={resetForm}
                aria-label="Close form"
              >
                ×
              </button>
            </div>

            <label htmlFor="task-title">Task name</label>
            <input
              id="task-title"
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
              placeholder="e.g. Finish my assignment"
              autoFocus
              required
            />

            <div className="form-row">
              <div>
                <label htmlFor="task-category">Category</label>
                <select
                  id="task-category"
                  value={newCategory}
                  onChange={(event) => setNewCategory(event.target.value)}
                >
                  <option>Personal</option>
                  <option>Work</option>
                  <option>Study</option>
                </select>
              </div>

              <div>
                <label htmlFor="task-priority">Priority</label>
                <select
                  id="task-priority"
                  value={newPriority}
                  onChange={(event) => setNewPriority(event.target.value)}
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
              </div>
            </div>

            <label htmlFor="task-due">Due date</label>
            <input
              id="task-due"
              type="date"
              value={newDue}
              onChange={(event) => setNewDue(event.target.value)}
            />

            <button
              className="primary-button submit-button"
              type="submit"
            >
              {editingId !== null ? "Save changes ✓" : "Create task →"}
            </button>
          </form>
        )}

        <section className="task-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">YOUR TO-DO LIST</p>
              <h2>
                {filter}{" "}
                <span className="result-count">{visibleTasks.length}</span>
              </h2>
            </div>

            <div className="search-box">
              <span>⌕</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search tasks..."
                aria-label="Search tasks"
              />
            </div>
          </div>

          {apiError && (
            <p role="alert" style={{ color: "#dc5252", marginBottom: "12px" }}>
              {apiError}
            </p>
          )}

          <div className="task-list">
            {loading ? (
              <div className="empty-state">
                <h3>Loading your tasks...</h3>
              </div>
            ) : visibleTasks.map((task) => {
              const overdue =
                !task.completed &&
                task.due &&
                task.due < getToday();

              return (
                <article
                  className={`task-row ${
                    task.completed ? "task-completed" : ""
                  }`}
                  key={task.id}
                >
                  <button
                    className={`task-check ${
                      task.completed ? "checked" : ""
                    }`}
                    onClick={() => toggleTask(task.id)}
                    aria-label={
                      task.completed
                        ? "Mark as pending"
                        : "Mark as completed"
                    }
                  >
                    {task.completed ? "✓" : ""}
                  </button>

                  <div className="task-details">
                    <strong>{task.title}</strong>
                    <div className="task-meta">
                      <span>{task.category}</span>
                      <span>·</span>
                      <span>{formatDueDate(task.due)}</span>
                      {overdue && (
                        <>
                          <span>·</span>
                          <span style={{ color: "#dc5252" }}>
                            Overdue
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <span
                    className={`priority priority-${task.priority.toLowerCase()}`}
                  >
                    {task.priority}
                  </span>

                  <button
                    className="delete-button"
                    onClick={() => deleteTask(task.id)}
                    aria-label={`Delete ${task.title}`}
                    title="Delete task"
                  >
                    ×
                  </button>

                  <button
                    className="delete-button"
                    onClick={() => openEditForm(task)}
                    aria-label={`Edit ${task.title}`}
                    title="Edit task"
                    style={{ fontSize: "16px" }}
                  >
                    ✎
                  </button>
                </article>
              );
            })}

            {!loading && visibleTasks.length === 0 && (
              <div className="empty-state">
                <span>✦</span>
                <h3>No tasks found</h3>
                <p>Try another search or add a new task.</p>
              </div>
            )}
          </div>
        </section>

        <footer className="footer-note">
          Made for your goals, one day at a time. <span>✦</span>
        </footer>
      </main>
    </div>
  );
}

export default App;
