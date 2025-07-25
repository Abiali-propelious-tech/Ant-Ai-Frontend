import type { Tag } from "./types";

export interface TagTableProps {
  tags: Tag[];
  onEdit: (tag: Tag) => void;
  onDelete: (tag: Tag) => void;
  onToggleActive: (tag: Tag) => void;
}

export function TagTable({
  tags, 
  onEdit,
  onDelete,
  onToggleActive,
}: TagTableProps) {
  return (
    <table className="w-full border mt-4">
      <thead>
        <tr className="bg-gray-100">
          <th className="p-2 text-left">Name</th>
          <th className="p-2 text-left">Active</th>
          <th className="p-2">Actions</th>
        </tr>
      </thead>
      <tbody>
        {tags.map((tag) => (
          <tr key={tag.Id} className="border-t">
            <td className="p-2">{tag.Name}</td>
            <td className="p-2">
              <button
                className={`px-2 py-1 rounded ${
                  tag.IsActive ? "bg-green-200" : "bg-red-200"
                }`}
                onClick={() => onToggleActive(tag)}
              >
                {tag.IsActive ? "Active" : "Inactive"}
              </button>
            </td>
            <td className="p-2 flex gap-2">
              <button className="text-blue-600" onClick={() => onEdit(tag)}>
                Edit
              </button>
              <button className="text-red-600" onClick={() => onDelete(tag)}>
                Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
