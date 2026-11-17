export interface Env {
  DB: D1Database;
}

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  completed: number;
  created_at: string;
};

type TaskJson = {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  createdAt: string;
};

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "http://localhost:5173",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
    },
  });
}

function empty(status: number): Response {
  return new Response(null, { status, headers: { ...CORS_HEADERS } });
}

function rowToTask(row: TaskRow): TaskJson {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    completed: row.completed === 1,
    createdAt: row.created_at,
  };
}

function notFound(): Response {
  return json({ error: "Not found" }, 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method.toUpperCase();

    if (method === "OPTIONS" && pathname.startsWith("/api/")) {
      return empty(204);
    }

    if (method === "GET" && pathname === "/") {
      const result = await env.DB.prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'tasks'",
      ).first<{ name: string }>();

      return json({
        ok: true,
        service: "task-manager-api",
        tasksTableReady: result?.name === "tasks",
      });
    }

    if (method === "GET" && pathname === "/api/tasks") {
      const { results } = await env.DB.prepare(
        "SELECT id, title, description, completed, created_at FROM tasks ORDER BY created_at DESC",
      ).all<TaskRow>();

      return json((results ?? []).map(rowToTask));
    }

    if (method === "POST" && pathname === "/api/tasks") {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return json({ error: "Invalid JSON body" }, 400);
      }

      if (!body || typeof body !== "object") {
        return json({ error: "Invalid JSON body" }, 400);
      }

      const record = body as Record<string, unknown>;
      const title =
        typeof record.title === "string" ? record.title.trim() : "";
      const description =
        typeof record.description === "string"
          ? record.description.trim()
          : "";

      if (!title) {
        return json({ error: "Title is required" }, 400);
      }
      if (title.length > 200) {
        return json({ error: "Title must be at most 200 characters" }, 400);
      }
      if (description.length > 2000) {
        return json(
          { error: "Description must be at most 2000 characters" },
          400,
        );
      }

      const id = crypto.randomUUID();
      const createdAt = new Date().toISOString();

      await env.DB.prepare(
        "INSERT INTO tasks (id, title, description, completed, created_at) VALUES (?, ?, ?, 0, ?)",
      )
        .bind(id, title, description === "" ? null : description, createdAt)
        .run();

      return json(
        {
          id,
          title,
          description,
          completed: false,
          createdAt,
        } satisfies TaskJson,
        201,
      );
    }

    const taskMatch = pathname.match(/^\/api\/tasks\/([^/]+)$/);
    if (taskMatch) {
      const id = decodeURIComponent(taskMatch[1]);

      if (method === "PATCH") {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return json({ error: "Invalid JSON body" }, 400);
        }

        if (
          !body ||
          typeof body !== "object" ||
          typeof (body as { completed?: unknown }).completed !== "boolean"
        ) {
          return json({ error: "Body must include boolean completed" }, 400);
        }

        const completed = (body as { completed: boolean }).completed ? 1 : 0;
        const update = await env.DB.prepare(
          "UPDATE tasks SET completed = ? WHERE id = ?",
        )
          .bind(completed, id)
          .run();

        if ((update.meta.changes ?? 0) === 0) {
          return notFound();
        }

        const row = await env.DB.prepare(
          "SELECT id, title, description, completed, created_at FROM tasks WHERE id = ?",
        )
          .bind(id)
          .first<TaskRow>();

        if (!row) {
          return notFound();
        }

        return json(rowToTask(row));
      }

      if (method === "DELETE") {
        const result = await env.DB.prepare("DELETE FROM tasks WHERE id = ?")
          .bind(id)
          .run();

        if ((result.meta.changes ?? 0) === 0) {
          return notFound();
        }

        return empty(204);
      }
    }

    if (pathname.startsWith("/api/")) {
      return notFound();
    }

    return notFound();
  },
} satisfies ExportedHandler<Env>;
