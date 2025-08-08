import { useState, useEffect } from "react";
import { useJwt } from "../../context/JwtContext";
import { TagForm } from "../../components/tag/TagForm";
import { TagTable } from "../../components/tag/TagTable";
import type { Tag } from "../../components/tag/types";
import { handleApiResponseWithFallback } from "../../utils/apiResponseHandler";

const BASE_URL = "https://devant13pythonapi.datagainservices.com";

export default function TagsTab() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editTag, setEditTag] = useState<Tag | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);

  const { jwt } = useJwt();
  useEffect(() => {
    setLoading(true);
    fetch(`${BASE_URL}/api/v1/tags?page=${page}&limit=${limit}`, {
      method: "GET",
      headers: jwt ? { Authorization: `Bearer ${jwt}` } : undefined,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch tags");
        const data = await handleApiResponseWithFallback(res, { items: [], total: 0 });
        if (Array.isArray(data)) {
          setTags(data);
          setTotal(data.length);
        } else {
          setTags(data.items || []);
          setTotal(data.total || (data.items?.length ?? 0));
        }
      })
      .catch(() => {
        setTags([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [page, limit, jwt]);

  function handleAdd() {
    setEditTag(null);
    setShowForm(true);
  }
  function handleEdit(tag: Tag) {
    setEditTag(tag);
    setShowForm(true);
  }
  async function handleDelete(tag: Tag) {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/v1/tags/${tag.Id}`, {
        method: "DELETE",
        headers: jwt ? { Authorization: `Bearer ${jwt}` } : undefined,
      });
      if (!res.ok) throw new Error("Delete failed");
      await handleApiResponseWithFallback(res, null);
      setTags((prev) => prev.filter((t) => t.Id !== tag.Id));
      setTotal((prev) => prev - 1);
    } catch {
      // Optionally show error
    } finally {
      setLoading(false);
    }
  }
  async function handleToggleActive(tag: Tag) {
    setLoading(true);
    try {
      const res = await fetch(
        `${BASE_URL}/api/v1/tags/status/${tag.Id}/?is_active=${!tag.IsActive}`,
        {
          method: "PATCH",
          headers: jwt ? { Authorization: `Bearer ${jwt}` } : undefined,
        }
      );
      if (!res.ok) throw new Error("Status update failed");
      setTags((prev) =>
        prev.map((t) => (t.Id === tag.Id ? { ...t, IsActive: !t.IsActive } : t))
      );
    } catch {
      // Optionally show error
    } finally {
      setLoading(false);
    }
  }
  async function handleFormSubmit(data: Partial<Tag>) {
    setLoading(true);
    try {
      if (editTag) {
        // Update
        const res = await fetch(`${BASE_URL}/api/v1/tags/${editTag.Id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
          },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error("Update failed");
        const updated = await handleApiResponseWithFallback(res, editTag);
        setTags((prev) => prev.map((t) => (t.Id === editTag.Id ? updated : t)));
      } else {
        // Create
        const res = await fetch(`${BASE_URL}/api/v1/tags`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
          },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error("Create failed");
        const created = await handleApiResponseWithFallback(res, data as Tag);
        setTags((prev) => [created, ...prev]);
        setTotal((prev) => prev + 1);
      }
    } catch {
      // Optionally show error
    } finally {
      setShowForm(false);
      setEditTag(null);
      setLoading(false);
    }
  }
  function handleFormCancel() {
    setShowForm(false);
    setEditTag(null);
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Tags</h2>
        <button
          className="bg-blue-600 text-white px-4 py-1 rounded"
          onClick={handleAdd}
        >
          Add Tag
        </button>
      </div>
      {showForm && (
        <TagForm
          initial={editTag || {}}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
        />
      )}
      {loading ? (
        <div>Loading...</div>
      ) : (
        <TagTable
          tags={tags}
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
