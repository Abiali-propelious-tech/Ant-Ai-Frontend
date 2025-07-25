import { useState } from "react";
import type { AIModelFormProps } from "./types";

export function AIModelForm({
  initial = {},
  onSubmit,
  onCancel,
}: AIModelFormProps) {
  const [name, setName] = useState(initial.Name || "");
  const [description, setDescription] = useState(initial.Description || "");
  const [modelName, setModelName] = useState(initial.ModelName || "");
  const [contextWindowSize, setContextWindowSize] = useState(
    initial.ContextWindowSize ?? 0
  );
  const [provider, setProvider] = useState(initial.Provider || "Chat-GPT");
  const [isActive, setIsActive] = useState(initial.IsActive ?? true);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      Name: name,
      Description: description,
      ModelName: modelName,
      ContextWindowSize: Number(contextWindowSize),
      Provider: provider,
      IsActive: isActive,
    });
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
      <div>
        <label className="block mb-1 font-medium">Description</label>
        <textarea
          className="border px-2 py-1 rounded w-full"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div>
        <label className="block mb-1 font-medium">Model Name</label>
        <input
          className="border px-2 py-1 rounded w-full"
          value={modelName}
          onChange={(e) => setModelName(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="block mb-1 font-medium">Context Window Size</label>
        <input
          type="number"
          className="border px-2 py-1 rounded w-full"
          value={contextWindowSize}
          onChange={(e) => setContextWindowSize(Number(e.target.value))}
          min={0}
          required
        />
      </div>
      <div>
        <label className="block mb-1 font-medium">Provider</label>
        <select
          className="border px-2 py-1 rounded w-full"
          value={provider}
          onChange={(e: any) => setProvider(e.target.value)}
          required
        >
          <option value="Chat-GPT">Chat-GPT</option>
          <option value="Gemini">Gemini</option>
          <option value="Claude">Claude</option>
          <option value="Groq">Groq</option>
        </select>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          id="isActiveModel"
        />
        <label htmlFor="isActiveModel">Active</label>
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
