"use client";
import { useJwt } from "@/context/JwtContext";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
interface AudioItem {
  id: string;
  userFileName: string;
  createdOn: string;
  dueDate: string;
  foreignLanguage: string;
  audioLanguage: string;
  transcription: string;
  status: string;
  duration: string | null;
  firstName: string;
  lastName: string;
  fileUrl: string;
  transcriptionType: number;
  linkToDownload: string;
  notes: string;
  isTranscriptAvailable: boolean;
  verbatimTranscription: boolean;
  pii: boolean;
  timestamps: boolean;
  managedService: boolean;
  type: string;
  uploadedBy: string;
  statusTxt: string;
  mediaFile: string;
  isShared: boolean;
  tags: number;
}

export default function ProjectAudioListPage({
  params,
}: {
  params: { id: string };
}) {
  const [audioList, setAudioList] = useState<AudioItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [formData, setFormData] = useState({
    audio_prompt: null as File | null,
    text: "",
    cfg_weight: "",
    exaggeration: "",
    project_id: params.id || "",
  });
  const router = useRouter();
  const { jwt } = useJwt();
  useEffect(() => {
    const fetchAudioList = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          "https://transcriptionclient2api.datagainservices.com/api/Project/ProjectAudioListGrid",
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
              // TODO: Use JWT from context if needed
              authorization: `Bearer ${jwt}`,
            },
            body: JSON.stringify({
              page: 1,
              rowNumber: 15,
              sortRowName: "createdOn",
              sortRowDirection: "desc",
              search: "",
              statusSearch: "",
              languageSearch: "",
              serviceSearch: "",
              transcriptSearch: "",
              dueDateSearch: "",
              createdDateSearch: "",
              projectId: params.id,
            }),
          }
        );
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setAudioList(data.value?.listData || []);
      } catch (err: any) {
        setError(err.message || "Failed to fetch audio list.");
      } finally {
        setLoading(false);
      }
    };
    fetchAudioList();
  }, [params.id, jwt]);

  return (
    <div
      style={{
        padding: 24,
        maxWidth: 1200,
        margin: "0 auto",
        background: "#fff",
        color: "#222",
        minHeight: "100vh",
      }}
    >
      <h2
        style={{
          fontSize: 28,
          fontWeight: 700,
          marginBottom: 24,
          textAlign: "center",
        }}
      >
        Project Audio List
      </h2>
      {loading && (
        <div style={{ color: "#0070f3", textAlign: "center" }}>Loading...</div>
      )}
      {error && (
        <div style={{ color: "#e74c3c", textAlign: "center" }}>
          Error: {error}
        </div>
      )}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          background: "#f5f5f5",
          borderRadius: 8,
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          marginTop: 24,
        }}
      >
        <thead>
          <tr style={{ background: "#f5f5f5" }}>
            <th style={{ padding: 10, textAlign: "left" }}>ID</th>
            <th style={{ padding: 10, textAlign: "left" }}>File Name</th>
            <th style={{ padding: 10, textAlign: "left" }}>Created On</th>
            <th style={{ padding: 10, textAlign: "left" }}>Due Date</th>
            <th style={{ padding: 10, textAlign: "left" }}>Status</th>
            <th style={{ padding: 10, textAlign: "left" }}>Duration</th>
            <th style={{ padding: 10, textAlign: "left" }}>Audio Language</th>
            <th style={{ padding: 10, textAlign: "left" }}>Foreign Language</th>
            <th style={{ padding: 10, textAlign: "left" }}>Uploaded By</th>
            <th style={{ padding: 10, textAlign: "left" }}>
              Transcript Available
            </th>
            <th style={{ padding: 10, textAlign: "left" }}>Download</th>
          </tr>
        </thead>
        <tbody>
          {audioList.length === 0 && !loading && (
            <tr>
              <td
                colSpan={11}
                style={{ textAlign: "center", padding: 16, color: "#888" }}
              >
                No audio files found for this project.
              </td>
            </tr>
          )}
          {audioList.map((item) => (
            <tr
              key={item.id}
              style={{ borderBottom: "1px solid #e0e0e0", cursor: "pointer" }}
              onClick={() => router.push(`/chat/${item.id}`)}
            >
              <td style={{ padding: 10 }}>{item.id}</td>
              <td style={{ padding: 10 }}>{item.userFileName}</td>
              <td style={{ padding: 10 }}>{item.createdOn}</td>
              <td style={{ padding: 10 }}>{item.dueDate}</td>
              <td style={{ padding: 10 }}>{item.status}</td>
              <td style={{ padding: 10 }}>{item.duration || "-"}</td>
              <td style={{ padding: 10 }}>{item.audioLanguage}</td>
              <td style={{ padding: 10 }}>{item.foreignLanguage}</td>
              <td style={{ padding: 10 }}>{item.uploadedBy}</td>
              <td style={{ padding: 10 }}>
                {item.isTranscriptAvailable ? "Yes" : "No"}
              </td>
              <td style={{ padding: 10 }}>
                {item.linkToDownload ? (
                  <a
                    href={item.linkToDownload}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#0070f3", textDecoration: "underline" }}
                  >
                    Download
                  </a>
                ) : (
                  "-"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
