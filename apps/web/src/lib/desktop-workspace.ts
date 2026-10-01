const WORKSPACE_STORAGE_KEY = "personal-os:workspaces:v1";

export interface LocalWorkspace {
  id: string;
  label: string;
  rootPath: string;
}

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function desktopRuntimeAvailable(): boolean {
  return isTauri();
}

export function loadStoredWorkspaces(): LocalWorkspace[] {
  try {
    const raw = localStorage.getItem(WORKSPACE_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as LocalWorkspace[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveStoredWorkspaces(workspaces: LocalWorkspace[]): void {
  try {
    localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(workspaces));
  } catch {
    // private browsing / quota
  }
}

export async function pickWorkspaceDirectory(): Promise<LocalWorkspace | null> {
  if (!isTauri()) {
    return null;
  }
  const { open } = await import("@tauri-apps/plugin-dialog");
  const selected = await open({
    directory: true,
    multiple: false,
    title: "Escolher pasta autorizada",
  });
  if (!selected || Array.isArray(selected)) {
    return null;
  }
  const workspace: LocalWorkspace = {
    id: crypto.randomUUID(),
    label: selected.split(/[/\\]/).pop() ?? "Workspace",
    rootPath: selected,
  };
  const next = [...loadStoredWorkspaces(), workspace];
  saveStoredWorkspaces(next);
  return workspace;
}

export async function readTextFileFromWorkspace(
  workspace: LocalWorkspace,
  relativePath: string
): Promise<string> {
  if (!isTauri()) {
    throw new Error("Leitura local disponível apenas no app desktop.");
  }
  const { join } = await import("@tauri-apps/api/path");
  const { readTextFile } = await import("@tauri-apps/plugin-fs");
  const fullPath = await join(workspace.rootPath, relativePath);
  if (!fullPath.startsWith(workspace.rootPath)) {
    throw new Error("Caminho fora do workspace autorizado.");
  }
  return readTextFile(fullPath);
}
