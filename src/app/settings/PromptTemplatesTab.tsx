import { useState, useEffect } from "react";
import { useJwt } from "../../context/JwtContext";
import { PromptTemplateForm } from "../../components/prompt_template/PromptTemplateForm";
import { PromptTemplateTable } from "../../components/prompt_template/PromptTemplateTable";
import type { PromptTemplate } from "../../components/prompt_template/types";
import { handleApiResponseWithFallback } from "../../utils/apiResponseHandler";

const BASE_URL = "https://devant13pythonapi.datagainservices.com";

interface PromptTemplatesTabProps {
  tagOptions: { value: string; label: string }[];
  modelOptions: { value: string; label: string }[];
  tagMap: Record<string, string>;
  modelMap: Record<string, string>;
}

export default function PromptTemplatesTab({
  tagOptions,
  modelOptions,
  tagMap,
  modelMap,
}: PromptTemplatesTabProps) {

  console.log("🚀 ~ PromptTemplatesTab ~ tagMap:", tagMap);
  console.log("🚀 ~ PromptTemplatesTab ~ modelMap:", modelMap);

  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editTemplate, setEditTemplate] = useState<PromptTemplate | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);

  const { jwt } = useJwt();
  // Fetch prompt templates
  useEffect(() => {
    setLoading(true);
    fetch(`${BASE_URL}/api/v1/prompt-templates?page=${page}&limit=${limit}`, {
      headers: jwt ? { Authorization: `Bearer ${jwt}` } : undefined,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch prompt templates");
        const data = await handleApiResponseWithFallback(res, { items: [], total: 0 });
        if (Array.isArray(data)) {
          setTemplates(data);
          setTotal(data.length);
        } else {
          setTemplates(data.items || []);
          setTotal(data.total || (data.items?.length ?? 0));
        }
      })
      .catch(() => {
        setTemplates([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [page, limit, jwt]);

  // tagOptions, modelOptions, tagMap, modelMap are now received as props from parent

  function handleAdd() {
    setEditTemplate(null);
    setShowForm(true);
  }
  function handleEdit(template: PromptTemplate) {
    setEditTemplate(template);
    setShowForm(true);
  }
  async function handleDelete(template: PromptTemplate) {
    setLoading(true);
    try {
      const res = await fetch(
        `${BASE_URL}/api/v1/prompt-templates/${template.Id}`,
        {
          method: "DELETE",
          headers: jwt ? { Authorization: `Bearer ${jwt}` } : undefined,
        }
      );
      if (!res.ok) throw new Error("Delete failed");
      await handleApiResponseWithFallback(res, null);
      setTemplates((prev) => prev.filter((t) => t.Id !== template.Id));
      setTotal((prev) => prev - 1);
    } catch {
      // Optionally show error
    } finally {
      setLoading(false);
    }
  }
  async function handleToggleActive(template: PromptTemplate) {
    setLoading(true);
    try {
      const res = await fetch(
        `${BASE_URL}/api/v1/prompt-templates/status/${template.Id}/`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
          },
          body: JSON.stringify({ IsActive: !template.IsActive }),
        }
      );
      if (!res.ok) throw new Error("Status update failed");
      await handleApiResponseWithFallback(res, null);
      setTemplates((prev) =>
        prev.map((t) =>
          t.Id === template.Id ? { ...t, IsActive: !t.IsActive } : t
        )
      );
    } catch {
      // Optionally show error
    } finally {
      setLoading(false);
    }
  }
  async function handleFormSubmit(data: Partial<PromptTemplate>) {
    setLoading(true);
    try {
      const payload: any = {
        Name: data.Name,
        PromptTagsId: data.PromptTagsId,
        Prompt: data.Prompt,
        Description: data.Description,
        SingleModelList: data.SingleModelList,
        BatchModelList: data.BatchModelList,
        IsActive: data.IsActive,
      };
      if (editTemplate) {
        // Update
        const res = await fetch(
          `${BASE_URL}/api/v1/prompt-templates/${editTemplate.Id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
            },
            body: JSON.stringify(payload),
          }
        );
        if (!res.ok) throw new Error("Update failed");
        const updated = await handleApiResponseWithFallback(res, editTemplate);
        setTemplates((prev) =>
          prev.map((t) => (t.Id === editTemplate.Id ? updated : t))
        );
      } else {
        // Create
        const res = await fetch(`${BASE_URL}/api/v1/prompt-templates`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Create failed");
        const created = await handleApiResponseWithFallback(res, payload as PromptTemplate);
        setTemplates((prev) => [created, ...prev]);
        setTotal((prev) => prev + 1);
      }
    } catch {
      // Optionally show error
    } finally {
      setShowForm(false);
      setEditTemplate(null);
      setLoading(false);
    }
  }
  function handleFormCancel() {
    setShowForm(false);
    setEditTemplate(null);
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Prompt Templates</h2>
        <button
          className="bg-blue-600 text-white px-4 py-1 rounded"
          onClick={handleAdd}
        >
          Add Template
        </button>
      </div>
      {showForm && (
        <PromptTemplateForm
          initial={editTemplate || {}}
          tagOptions={tagOptions}
          modelOptions={modelOptions}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
        />
      )}
      {loading ? (
        <div>Loading...</div>
      ) : (
        <PromptTemplateTable
          templates={templates}
          tagMap={tagMap}
          modelMap={modelMap}
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
