import type { AIModel } from "./types";

export interface AIModelTableProps {
  models: AIModel[];
  onEdit: (model: AIModel) => void;
  onDelete: (model: AIModel) => void;
  onToggleActive: (model: AIModel) => void;
}

export function AIModelTable({
  models,
  onEdit,
  onDelete,
  onToggleActive,
}: AIModelTableProps) {
  return (
    <table className="w-full border mt-4">
      <thead>
        <tr className="bg-gray-100">
          <th className="p-2 text-left">Name</th>
          <th className="p-2 text-left">Description</th>
          <th className="p-2 text-left">Model Name</th>
          <th className="p-2 text-left">Context Window</th>
          <th className="p-2 text-left">Provider</th>
          <th className="p-2 text-left">Active</th>
          <th className="p-2">Actions</th>
        </tr>
      </thead>
      <tbody>
        {models.map((model) => (
          <tr key={model.Id} className="border-t">
            <td className="p-2">{model.Name}</td>
            <td className="p-2">
              {model.Description || <span className="text-gray-400">-</span>}
            </td>
            <td className="p-2">{model.ModelName}</td>
            <td className="p-2">{model.ContextWindowSize}</td>
            <td className="p-2">{model.Provider}</td>
            <td className="p-2">
              <button
                className={`px-2 py-1 rounded ${
                  model.IsActive ? "bg-green-200" : "bg-red-200"
                }`}
                onClick={() => onToggleActive(model)}
              >
                {model.IsActive ? "Active" : "Inactive"}
              </button>
            </td>
            <td className="p-2 flex gap-2">
              <button className="text-blue-600" onClick={() => onEdit(model)}>
                Edit
              </button>
              <button className="text-red-600" onClick={() => onDelete(model)}>
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
