import { useState } from "react";
import type { PromptTemplateFormProps } from "./types";

export function PromptTemplateForm({
  initial = {},
  tagOptions,
  modelOptions,
  onSubmit,
  onCancel,
}: PromptTemplateFormProps) {
  const [name, setName] = useState(initial.Name || "");
  const [promptTagsId, setPromptTagsId] = useState(
    initial.PromptTagsId || (tagOptions[0]?.value ?? "")
  );
  const [prompt, setPrompt] = useState(initial.Prompt || "");
  const [description, setDescription] = useState(initial.Description || "");
  const [singleModelList, setSingleModelList] = useState<string[]>(
    initial.SingleModelList || []
  );
  const [batchModelList, setBatchModelList] = useState<string[]>(
    initial.BatchModelList || []
  );
  const [isActive, setIsActive] = useState(initial.IsActive ?? true);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      Name: name,
      PromptTagsId: promptTagsId,
      Prompt: prompt,
      Description: description,
      SingleModelList: singleModelList,
      BatchModelList: batchModelList,
      IsActive: isActive,
    });
  }

  function handleMultiSelectChange(
    setter: (v: string[]) => void,
    values: string[]
  ) {
    setter(values);
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
        <label className="block mb-1 font-medium">Prompt Tag</label>
        <select
          className="border px-2 py-1 rounded w-full"
          value={promptTagsId}
          onChange={(e) => setPromptTagsId(e.target.value)}
          required
        >
          {tagOptions.map((tag) => (
            <option key={tag.value} value={tag.value}>
              {tag.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block mb-1 font-medium">Prompt</label>
        <textarea
          className="border px-2 py-1 rounded w-full"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
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
        <label className="block mb-1 font-medium">Single Model List</label>
        <select
          className="border px-2 py-1 rounded w-full"
          multiple
          value={singleModelList}
          onChange={(e) =>
            handleMultiSelectChange(
              setSingleModelList,
              Array.from(e.target.selectedOptions, (opt) => opt.value)
            )
          }
        >
          {modelOptions.map((model) => (
            <option key={model.value} value={model.value}>
              {model.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block mb-1 font-medium">Batch Model List</label>
        <select
          className="border px-2 py-1 rounded w-full"
          multiple
          value={batchModelList}
          onChange={(e) =>
            handleMultiSelectChange(
              setBatchModelList,
              Array.from(e.target.selectedOptions, (opt) => opt.value)
            )
          }
        >
          {modelOptions.map((model) => (
            <option key={model.value} value={model.value}>
              {model.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          id="isActivePromptTemplate"
        />
        <label htmlFor="isActivePromptTemplate">Active</label>
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
