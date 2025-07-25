import { useState, useEffect } from "react";
import { useJwt } from "../../context/JwtContext";
import { AIModelForm } from "../../components/ai_model/AIModelForm";
import { AIModelTable } from "../../components/ai_model/AIModelTable";
import type { AIModel } from "../../components/ai_model/types";

const BASE_URL = "http://localhost:8000";

export default function AIModelsTab() {
  const [models, setModels] = useState<AIModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editModel, setEditModel] = useState<AIModel | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);

  const { jwt } = useJwt();
  // Fetch AI models from backend
  useEffect(() => {
    setLoading(true);
    fetch(`${BASE_URL}/api/v1/aimodals?page=${page}&limit=${limit}`, {
      method: "GET",
      headers: jwt ? { Authorization: `Bearer ${jwt}` } : undefined,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch models");
        const data = await res.json();
        if (Array.isArray(data)) {
          setModels(data);
          setTotal(data.length);
        } else {
          setModels(data.items || []);
          setTotal(data.total || (data.items?.length ?? 0));
        }
      })
      .catch(() => {
        setModels([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [page, limit, jwt]);

  function handleAdd() {
    setEditModel(null);
    setShowForm(true);
  }
  function handleEdit(model: AIModel) {
    setEditModel(model);
    setShowForm(true);
  }
  async function handleDelete(model: AIModel) {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/aimodals/${model.Id}`, {
        method: "DELETE",
        headers: jwt ? { Authorization: `Bearer ${jwt}` } : undefined,
      });
      if (!res.ok) throw new Error("Delete failed");
      setModels((prev) => prev.filter((m) => m.Id !== model.Id));
      setTotal((prev) => prev - 1);
    } catch {
      // Optionally show error
    } finally {
      setLoading(false);
    }
  }
  async function handleToggleActive(model: AIModel) {
    setLoading(true);
    try {
      // PATCH expects body: { IsActive: boolean }
      const res = await fetch(
        `${BASE_URL}/api/v1/aimodals/status/${model.Id}/`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
          },
          body: JSON.stringify({ IsActive: !model.IsActive }),
        }
      );
      if (!res.ok) throw new Error("Status update failed");
      setModels((prev) =>
        prev.map((m) =>
          m.Id === model.Id ? { ...m, IsActive: !m.IsActive } : m
        )
      );
    } catch {
      // Optionally show error
    } finally {
      setLoading(false);
    }
  }
  async function handleFormSubmit(data: Partial<AIModel>) {
    setLoading(true);
    try {
      // Only send fields that are relevant for create/update
      const payload: any = {
        Name: data.Name,
        Description: data.Description,
        ModelName: data.ModelName,
        ContextWindowSize: data.ContextWindowSize,
        Provider: data.Provider,
      };
      if (editModel) {
        // Update
        const res = await fetch(`${BASE_URL}/api/v1/aimodals/${editModel.Id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Update failed");
        const updated = await res.json();
        setModels((prev) =>
          prev.map((m) => (m.Id === editModel.Id ? updated : m))
        );
      } else {
        // Create
        const res = await fetch(`${BASE_URL}/api/v1/aimodals/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Create failed");
        const created = await res.json();
        setModels((prev) => [created, ...prev]);
        setTotal((prev) => prev + 1);
      }
    } catch {
      // Optionally show error
    } finally {
      setShowForm(false);
      setEditModel(null);
      setLoading(false);
    }
  }
  function handleFormCancel() {
    setShowForm(false);
    setEditModel(null);
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">AI Models</h2>
        <button
          className="bg-blue-600 text-white px-4 py-1 rounded"
          onClick={handleAdd}
        >
          Add Model
        </button>
      </div>
      {showForm && (
        <AIModelForm
          initial={editModel || {}}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
        />
      )}
      {loading ? (
        <div>Loading...</div>
      ) : (
        <AIModelTable
          models={models}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggleActive={handleToggleActive}
        />
      )}
      {/* Pagination */}
      <div className="flex justify-end gap-2 mt-4">
        <button
          className="px-3 py-1 border rounded disabled:opacity-50"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          Prev
        </button>
        <span className="px-2">
          Page {page} of {Math.ceil(total / limit)}
        </span>
        <button
          className="px-3 py-1 border rounded disabled:opacity-50"
          onClick={() => setPage((p) => p + 1)}
          disabled={page * limit >= total}
        >
          Next
        </button>
      </div>
    </div>
  );
}
