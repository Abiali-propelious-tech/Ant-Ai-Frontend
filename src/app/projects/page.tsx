"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useJwt } from "@/context/JwtContext";

interface Invite {
  inviteDetail: string;
  inviteePhoto: string | null;
}

interface Project {
  id: string;
  fileId: string;
  createdOn: string;
  projectName: string;
  files: number;
  email: string;
  permission: number;
  projectOwner: string;
  isFile: boolean;
  analysis: string;
  invites: Invite[] | null;
  tags: number;
  reports: number;
}
export default function ProjectsPage() {
  const { jwt } = useJwt();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!jwt) return;
    setLoading(true);
    setError(null);
    fetch(
      "https://transcriptionclient2api.datagainservices.com/api/Project/GetProjectsByClientIdGrid",
      {
        method: "POST",
        headers: {
          accept: "*/*",
          "content-type": "application/json",
          authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          page: 1,
          rowNumber: 100,
          sortRowName: "createdOn",
          sortRowDirection: "desc",
          search: "",
          createdBy: "00000000-0000-0000-0000-000000000000",
          analysis: 1,
        }),
      }
    )
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch projects");
        return res.json();
      })
      .then((data) => {
        setProjects(data?.value?.listData || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [jwt]);

  return (
    <div style={{ maxWidth: 900, margin: 2 }}>
      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div style={{ color: "red" }}>Error: {error}</div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th style={{ textAlign: "left", padding: 8 }}>Id</th>
              <th style={{ textAlign: "left", padding: 8 }}>Project Name</th>
              <th style={{ textAlign: "left", padding: 8 }}>Created On</th>
              <th style={{ textAlign: "left", padding: 8 }}>Owner</th>
              <th style={{ textAlign: "left", padding: 8 }}>Email</th>
              <th style={{ textAlign: "left", padding: 8 }}>Files</th>
              <th style={{ textAlign: "left", padding: 8 }}>Tags</th>
              <th style={{ textAlign: "left", padding: 8 }}>Reports</th>
              <th style={{ textAlign: "left", padding: 8 }}>Invites</th>
            </tr>
          </thead>
          <tbody>
            {projects.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: 8 }}>
                  No projects found.
                </td>
              </tr>
            ) : (
              projects.map((project) => (
                <tr
                  key={project.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => router.push(`/projects/${project.id}`)}
                >
                  <td style={{ padding: 8 }}>{project.id}</td>
                  <td style={{ padding: 8 }}>{project.projectName}</td>
                  <td style={{ padding: 8 }}>{project.createdOn}</td>
                  <td style={{ padding: 8 }}>{project.projectOwner}</td>
                  <td style={{ padding: 8 }}>{project.email}</td>
                  <td style={{ padding: 8 }}>{project.files}</td>
                  <td style={{ padding: 8 }}>{project.tags}</td>
                  <td style={{ padding: 8 }}>{project.reports}</td>
                  <td style={{ padding: 8 }}>
                    {project.invites && project.invites.length > 0
                      ? project.invites.map((invite, idx) => (
                          <span key={idx} style={{ marginRight: 8 }}>
                            {invite.inviteDetail}
                          </span>
                        ))
                      : "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
