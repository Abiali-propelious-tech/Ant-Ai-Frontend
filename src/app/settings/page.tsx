"use client";
import { useState } from "react";
import { useEffect } from "react";

import AIModelsTab from "./AIModelsTab";
import TagsTab from "./TagsTab";
import PromptTemplatesTab from "./PromptTemplatesTab";
import { handleApiResponseWithFallback } from "../../utils/apiResponseHandler";
import { useJwt } from "../../context/JwtContext";

const BASE_URL = "https://devant13pythonapi.datagainservices.com";
const TABS = [
  { key: "tags", label: "Tags" },
  { key: "ai_models", label: "AI Models" },
  { key: "prompt_templates", label: "Prompt Templates" },
];

export default function SettingsPage() {
  const { jwt } = useJwt();
  const [activeTab, setActiveTab] = useState("tags");
  const [tagOptions, setTagOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [modelOptions, setModelOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [tagMap, setTagMap] = useState<Record<string, string>>({});
  const [modelMap, setModelMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!jwt) return;
    
    fetch(`${BASE_URL}/api/v1/tags?page=1&limit=100`, {
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch tags");
        const data = await handleApiResponseWithFallback(res, { items: [] });
        const items = Array.isArray(data) ? data : data.items || [];
        setTagOptions(items.map((t: any) => ({ value: t.Id, label: t.Name })));
        setTagMap(Object.fromEntries(items.map((t: any) => [t.Id, t.Name])));
      })
      .catch(() => {
        setTagOptions([]);
        setTagMap({});
      });
    fetch(`${BASE_URL}/api/v1/aimodals?page=1&limit=100`, {
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch models");
        const data = await handleApiResponseWithFallback(res, { items: [] });
        const items = Array.isArray(data) ? data : data.items || [];
        setModelOptions(
          items.map((m: any) => ({ value: m.Id, label: m.Name }))
        );
        setModelMap(Object.fromEntries(items.map((m: any) => [m.Id, m.Name])));
      })
      .catch(() => {
        setModelOptions([]);
        setModelMap({});
      });
  }, [jwt]);
 

  return (
    <div className="max-w-4xl mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <div className="flex border-b mb-8">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`px-4 py-2 -mb-px border-b-2 transition-colors duration-200 focus:outline-none ${
              activeTab === tab.key
                ? "border-blue-500 text-blue-600 font-semibold"
                : "border-transparent text-gray-500 hover:text-blue-500"
            }`}
            onClick={() => setActiveTab(tab.key)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div>
        {activeTab === "tags" && <TagsTab />}
        {activeTab === "ai_models" && <AIModelsTab />}
        {activeTab === "prompt_templates" && (
          <PromptTemplatesTab
            tagOptions={tagOptions}
            modelOptions={modelOptions}
            tagMap={tagMap}
            modelMap={modelMap}
          />
        )}
      </div>
    </div>
  );
}
