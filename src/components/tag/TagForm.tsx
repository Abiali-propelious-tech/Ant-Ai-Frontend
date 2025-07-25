import { useState } from "react";
import type { TagFormProps } from "./types";

export function TagForm({ initial = {}, onSubmit, onCancel }: TagFormProps) {
  const [name, setName] = useState(initial.Name || "");
  const [isActive, setIsActive] = useState(initial.IsActive ?? true);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ Name: name, IsActive: isActive });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-gray-50 rounded">
      <div>
        <label className="block mb-1 font-medium">Name</label>
        <input
          className="border px-2 py-1 rounded w-full"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          id="isActive"
        />
        <label htmlFor="isActive">Active</label>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-1 rounded"
        >
          Save
        </button>
        <button
          type="button"
          className="px-4 py-1 rounded border"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
