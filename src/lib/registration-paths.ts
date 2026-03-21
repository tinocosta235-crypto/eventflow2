export type RegistrationPathEmailMap = {
  inviteTemplateId?: string | null;
  confirmationTemplateId?: string | null;
  waitlistTemplateId?: string | null;
  reminderTemplateId?: string | null;
  updateTemplateId?: string | null;
  followupTemplateId?: string | null;
};

export type RegistrationPath = {
  id: string;
  name: string;
  description: string;
  groupId: string | null;
  active: boolean;
  formMode: "EVENT_DEFAULT";
  flowMode: "GROUP_SCOPED";
  emailTemplateIds: RegistrationPathEmailMap;
};

export type RegistrationPathsConfig = {
  version: 1;
  updatedAt: string;
  paths: RegistrationPath[];
};

type EventGroupLite = {
  id: string;
  name: string;
};

function defaultPathForGroup(group: EventGroupLite): RegistrationPath {
  return {
    id: `path_${group.id}`,
    name: group.name,
    description: "",
    groupId: group.id,
    active: true,
    formMode: "EVENT_DEFAULT",
    flowMode: "GROUP_SCOPED",
    emailTemplateIds: {},
  };
}

function defaultStandalonePath(): RegistrationPath {
  return {
    id: "path_default",
    name: "Registrazione standard",
    description: "",
    groupId: null,
    active: true,
    formMode: "EVENT_DEFAULT",
    flowMode: "GROUP_SCOPED",
    emailTemplateIds: {},
  };
}

function sanitizeEmailMap(input: unknown): RegistrationPathEmailMap {
  if (!input || typeof input !== "object") return {};
  const raw = input as Record<string, unknown>;
  return {
    inviteTemplateId: typeof raw.inviteTemplateId === "string" ? raw.inviteTemplateId : null,
    confirmationTemplateId: typeof raw.confirmationTemplateId === "string" ? raw.confirmationTemplateId : null,
    waitlistTemplateId: typeof raw.waitlistTemplateId === "string" ? raw.waitlistTemplateId : null,
    reminderTemplateId: typeof raw.reminderTemplateId === "string" ? raw.reminderTemplateId : null,
    updateTemplateId: typeof raw.updateTemplateId === "string" ? raw.updateTemplateId : null,
    followupTemplateId: typeof raw.followupTemplateId === "string" ? raw.followupTemplateId : null,
  };
}

function sanitizePath(input: unknown, groups: EventGroupLite[]): RegistrationPath | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const groupId =
    typeof raw.groupId === "string" && groups.some((group) => group.id === raw.groupId)
      ? raw.groupId
      : null;

  return {
    id: typeof raw.id === "string" && raw.id.trim() ? raw.id.slice(0, 80) : `path_${Date.now()}`,
    name: typeof raw.name === "string" && raw.name.trim()
      ? raw.name.slice(0, 80)
      : (groupId ? groups.find((group) => group.id === groupId)?.name ?? "Percorso" : "Percorso"),
    description: typeof raw.description === "string" ? raw.description.slice(0, 240) : "",
    groupId,
    active: raw.active !== false,
    formMode: "EVENT_DEFAULT",
    flowMode: "GROUP_SCOPED",
    emailTemplateIds: sanitizeEmailMap(raw.emailTemplateIds),
  };
}

export function parseRegistrationPathsConfig(raw: string | null | undefined, groups: EventGroupLite[]): RegistrationPathsConfig {
  let parsedPaths: RegistrationPath[] = [];

  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<RegistrationPathsConfig>;
      parsedPaths = Array.isArray(parsed.paths)
        ? parsed.paths
            .map((path) => sanitizePath(path, groups))
            .filter(Boolean) as RegistrationPath[]
        : [];
    } catch {
      parsedPaths = [];
    }
  }

  const byGroupId = new Map(parsedPaths.filter((path) => path.groupId).map((path) => [path.groupId as string, path]));
  const syncedFromGroups = groups.map((group) => byGroupId.get(group.id) ?? defaultPathForGroup(group));
  const standalonePaths = parsedPaths.filter((path) => !path.groupId);
  const paths = groups.length > 0 ? [...syncedFromGroups, ...standalonePaths] : (standalonePaths.length ? standalonePaths : [defaultStandalonePath()]);

  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    paths,
  };
}

export function serializeRegistrationPathsConfig(config: RegistrationPathsConfig) {
  return JSON.stringify({
    version: 1,
    updatedAt: new Date().toISOString(),
    paths: config.paths,
  });
}

export function resolveRegistrationPathById(paths: RegistrationPath[], pathId: string | null | undefined) {
  if (!pathId) return null;
  return paths.find((path) => path.id === pathId) ?? null;
}

export function resolveRegistrationPathByGroup(paths: RegistrationPath[], groupId: string | null | undefined) {
  if (!groupId) return paths.find((path) => path.groupId === null) ?? null;
  return paths.find((path) => path.groupId === groupId) ?? null;
}
