import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  createTask,
  deleteTask,
  listTasks,
  setTaskCompleted,
} from "./api";
import type { Task } from "./types";
import "./App.css";

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<Record<string, boolean>>({});

  const refresh = useCallback(async () => {
    setError(null);
    const next = await listTasks();
    setTasks(next);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refresh();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load tasks");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle || submitting) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const created = await createTask(trimmedTitle, description.trim());
      setTasks((current) => [created, ...current]);
      setTitle("");
      setDescription("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setSubmitting(false);
    }
  }

  async function onToggle(task: Task) {
    if (busyIds[task.id]) {
      return;
    }
    setBusyIds((current) => ({ ...current, [task.id]: true }));
    setError(null);
    try {
      const updated = await setTaskCompleted(task.id, !task.completed);
      setTasks((current) =>
        current.map((item) => (item.id === task.id ? updated : item)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update task");
    } finally {
      setBusyIds((current) => {
        const next = { ...current };
        delete next[task.id];
        return next;
      });
    }
  }

  async function onDelete(task: Task) {
    if (busyIds[task.id]) {
      return;
    }
    setBusyIds((current) => ({ ...current, [task.id]: true }));
    setError(null);
    try {
      await deleteTask(task.id);
      setTasks((current) => current.filter((item) => item.id !== task.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete task");
      setBusyIds((current) => {
        const next = { ...current };
        delete next[task.id];
        return next;
      });
    }
  }

  return (
    <div className="page">
      <header className="header">
        <h1>Task Manager</h1>
        <p>Add tasks, mark them done, and delete them when finished.</p>
      </header>

      <form className="create-form" onSubmit={onSubmit}>
        <label>
          Title
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="What needs doing?"
            maxLength={200}
            required
            disabled={submitting}
          />
        </label>
        <label>
          Description (optional)
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Extra detail"
            maxLength={2000}
            rows={3}
            disabled={submitting}
          />
        </label>
        <button type="submit" disabled={submitting || !title.trim()}>
          {submitting ? "Adding…" : "Add task"}
        </button>
      </form>

      {error ? <p className="error" role="alert">{error}</p> : null}

      <section className="list-section" aria-live="polite">
        <h2>Tasks</h2>
        {loading ? <p className="muted">Loading tasks…</p> : null}
        {!loading && tasks.length === 0 ? (
          <p className="muted">No tasks yet. Add one above.</p>
        ) : null}
        <ul className="task-list">
          {tasks.map((task) => {
            const busy = Boolean(busyIds[task.id]);
            return (
              <li
                key={task.id}
                className={task.completed ? "task completed" : "task"}
              >
                <div className="task-body">
                  <strong>{task.title}</strong>
                  {task.description ? <p>{task.description}</p> : null}
                </div>
                <div className="task-actions">
                  <button
                    type="button"
                    onClick={() => onToggle(task)}
                    disabled={busy}
                  >
                    {task.completed ? "Mark incomplete" : "Mark complete"}
                  </button>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => onDelete(task)}
                    disabled={busy}
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
