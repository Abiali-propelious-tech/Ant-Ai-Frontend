import type { PromptTemplate } from "./types";

export interface PromptTemplateTableProps {
  templates: PromptTemplate[];
  tagMap: Record<string, string>;
  modelMap: Record<string, string>;
  onEdit: (template: PromptTemplate) => void;
  onDelete: (template: PromptTemplate) => void;
  onToggleActive: (template: PromptTemplate) => void;
}

export function PromptTemplateTable({
  templates,
  tagMap,
  modelMap,
  onEdit,
  onDelete,
  onToggleActive,
}: PromptTemplateTableProps) {
  return (
    <table className="w-full border mt-4">
      <thead>
        <tr className="bg-gray-100">
          <th className="p-2 text-left">Name</th>
          <th className="p-2 text-left">Prompt Tag</th>
          <th className="p-2 text-left">Prompt</th>
          <th className="p-2 text-left">Description</th>
          <th className="p-2 text-left">Single Model List</th>
          <th className="p-2 text-left">Batch Model List</th>
          <th className="p-2 text-left">Active</th>
          <th className="p-2">Actions</th>
        </tr>
      </thead>
      <tbody>
        {templates.map((template) => (
          <tr key={template.Id} className="border-t">
            <td className="p-2">{template.Name}</td>
            <td className="p-2">
              {tagMap[template.PromptTagsId] || template.PromptTagsId}
            </td>
            <td className="p-2 max-w-xs truncate" title={template.Prompt}>
              {template.Prompt}
            </td>
            <td className="p-2">
              {template.Description || <span className="text-gray-400">-</span>}
            </td>
            <td className="p-2">
              {template.SingleModelList?.map((id) => modelMap[id] || id).join(
                ", "
              ) || <span className="text-gray-400">-</span>}
            </td>
            <td className="p-2">
              {template.BatchModelList?.map((id) => modelMap[id] || id).join(
                ", "
              ) || <span className="text-gray-400">-</span>}
            </td>
            <td className="p-2">
              <button
                className={`px-2 py-1 rounded ${
                  template.IsActive ? "bg-green-200" : "bg-red-200"
                }`}
                onClick={() => onToggleActive(template)}
              >
                {template.IsActive ? "Active" : "Inactive"}
              </button>
            </td>
            <td className="p-2 flex gap-2">
              <button
                className="text-blue-600"
                onClick={() => onEdit(template)}
              >
                Edit
              </button>
              <button
                className="text-red-600"
                onClick={() => onDelete(template)}
              >
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
