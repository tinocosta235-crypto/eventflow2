export type BuilderStatus = "DRAFT" | "APPROVED";

export type BuilderBranding = {
  logoUrl?: string;
  headerImageUrl?: string;
  accentColor: string;
  fontFamily: string;
};

export type TextBlock = {
  id: string;
  kind: "text";
  title?: string;
  content: string;
};

export type ImageBlock = {
  id: string;
  kind: "image";
  imageUrl: string;
  alt?: string;
};

export type ButtonBlock = {
  id: string;
  kind: "button";
  label: string;
  href: string;
};

export type DividerBlock = {
  id: string;
  kind: "divider";
};

export type SpacerBlock = {
  id: string;
  kind: "spacer";
  height: number;
};

export type Columns2Block = {
  id: string;
  kind: "columns-2";
  leftTitle?: string;
  leftBody: string;
  rightTitle?: string;
  rightBody: string;
};

export type Columns3Block = {
  id: string;
  kind: "columns-3";
  col1Title?: string;
  col1Body: string;
  col2Title?: string;
  col2Body: string;
  col3Title?: string;
  col3Body: string;
};

export type ButtonGroupBlock = {
  id: string;
  kind: "button-group";
  buttons: Array<{ label: string; href: string; style: "primary" | "secondary" | "outline" }>;
};

export type SocialLinksBlock = {
  id: string;
  kind: "social-links";
  links: Array<{ platform: "facebook" | "instagram" | "linkedin" | "twitter" | "youtube" | "website"; url: string }>;
};

export type TextImageBlock = {
  id: string;
  kind: "text-image";
  imagePosition: "left" | "right";
  imageUrl: string;
  alt?: string;
  title?: string;
  content: string;
};

export type BuilderBlock =
  | TextBlock
  | ImageBlock
  | ButtonBlock
  | DividerBlock
  | SpacerBlock
  | Columns2Block
  | Columns3Block
  | ButtonGroupBlock
  | SocialLinksBlock
  | TextImageBlock;

export type BuilderVersion = {
  at: string;
  note?: string;
  status: BuilderStatus;
};

export type EmailBuilderPayload = {
  format: "eventflow_email_v1";
  status: BuilderStatus;
  branding: BuilderBranding;
  audience: {
    statuses: string[];
    groupIds: string[];
  };
  blocks: BuilderBlock[];
  versions: BuilderVersion[];
};

export type TemplateVariables = {
  firstName: string;
  lastName: string;
  eventTitle: string;
};

const DEFAULT_BRANDING: BuilderBranding = {
  accentColor: "#7060CC",
  fontFamily: "'DM Sans', 'Segoe UI', Arial, sans-serif",
};

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function applyVariables(input: string, vars: TemplateVariables) {
  return input
    .replace(/\{\{firstName\}\}/g, vars.firstName)
    .replace(/\{\{lastName\}\}/g, vars.lastName)
    .replace(/\{\{eventTitle\}\}/g, vars.eventTitle);
}

export function parseBuilderPayload(raw: string): EmailBuilderPayload | null {
  if (!raw || typeof raw !== "string") return null;
  try {
    const parsed = JSON.parse(raw) as Partial<EmailBuilderPayload>;
    if (parsed.format !== "eventflow_email_v1" || !Array.isArray(parsed.blocks)) return null;
    return {
      format: "eventflow_email_v1",
      status: parsed.status === "APPROVED" ? "APPROVED" : "DRAFT",
      branding: {
        ...DEFAULT_BRANDING,
        ...(parsed.branding ?? {}),
      },
      audience: {
        statuses: Array.isArray(parsed.audience?.statuses)
          ? parsed.audience.statuses
          : ["CONFIRMED", "PENDING"],
        groupIds: Array.isArray(parsed.audience?.groupIds)
          ? parsed.audience.groupIds
          : [],
      },
      blocks: parsed.blocks as BuilderBlock[],
      versions: Array.isArray(parsed.versions) ? parsed.versions : [],
    };
  } catch {
    return null;
  }
}

export function createDefaultBuilderPayload(eventTitle = "Il tuo evento"): EmailBuilderPayload {
  const now = new Date().toISOString();
  return {
    format: "eventflow_email_v1",
    status: "DRAFT",
    branding: DEFAULT_BRANDING,
    audience: {
      statuses: ["CONFIRMED", "PENDING"],
      groupIds: [],
    },
    blocks: [
      {
        id: "blk_intro",
        kind: "text",
        title: "Intro",
        content: `Ciao {{firstName}},\n\nsei invitato a {{eventTitle}}.`,
      },
      {
        id: "blk_cols",
        kind: "columns-2",
        leftTitle: "Agenda",
        leftBody: "08:30 Accredito\n09:00 Opening",
        rightTitle: "Location",
        rightBody: `${eventTitle}\nMilano`,
      },
      {
        id: "blk_cta",
        kind: "button",
        label: "Completa registrazione",
        href: "https://eventflow.app",
      },
    ],
    versions: [{ at: now, status: "DRAFT", note: "Initial draft" }],
  };
}

export function serializeBuilderPayload(payload: EmailBuilderPayload) {
  return JSON.stringify(payload);
}

export function appendBuilderVersion(payload: EmailBuilderPayload, note?: string) {
  const nextVersions = [
    ...payload.versions,
    { at: new Date().toISOString(), status: payload.status, note: note || undefined },
  ].slice(-20);
  return { ...payload, versions: nextVersions };
}

function renderBlock(block: BuilderBlock, vars: TemplateVariables, accentColor: string): string {
  if (block.kind === "text") {
    const title = block.title ? `<h3 style="margin:0 0 8px;font-size:18px;color:#0f172a;">${escapeHtml(block.title)}</h3>` : "";
    const content = applyVariables(block.content, vars).split("\n").map(escapeHtml).join("<br />");
    return `${title}<div style="font-size:15px;line-height:1.7;color:#334155;">${content}</div>`;
  }
  if (block.kind === "image") {
    if (!block.imageUrl) return "";
    return `<img src="${escapeHtml(block.imageUrl)}" alt="${escapeHtml(block.alt ?? "image")}" style="max-width:100%;border-radius:12px;display:block;" />`;
  }
  if (block.kind === "button") {
    if (!block.href) return "";
    return `<a href="${escapeHtml(block.href)}" style="display:inline-block;padding:12px 18px;background:${escapeHtml(accentColor)};color:#fff;text-decoration:none;border-radius:10px;font-weight:600;">${escapeHtml(block.label || "Apri")}</a>`;
  }
  if (block.kind === "divider") {
    return `<hr style="border:0;border-top:1px solid #e2e8f0;margin:8px 0;" />`;
  }
  if (block.kind === "spacer") {
    return `<div style="height:${Math.max(0, Number(block.height) || 12)}px;"></div>`;
  }
  if (block.kind === "columns-2") {
    const leftBody = applyVariables(block.leftBody, vars).split("\n").map(escapeHtml).join("<br />");
    const rightBody = applyVariables(block.rightBody, vars).split("\n").map(escapeHtml).join("<br />");
    return `
      <table width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed;">
        <tr>
          <td style="vertical-align:top;padding-right:8px;">
            ${block.leftTitle ? `<div style="font-size:14px;font-weight:700;color:#1A0A3D;margin-bottom:4px;">${escapeHtml(block.leftTitle)}</div>` : ""}
            <div style="font-size:14px;color:#3D2F6A;line-height:1.6;">${leftBody}</div>
          </td>
          <td style="vertical-align:top;padding-left:8px;">
            ${block.rightTitle ? `<div style="font-size:14px;font-weight:700;color:#1A0A3D;margin-bottom:4px;">${escapeHtml(block.rightTitle)}</div>` : ""}
            <div style="font-size:14px;color:#3D2F6A;line-height:1.6;">${rightBody}</div>
          </td>
        </tr>
      </table>`;
  }
  if (block.kind === "columns-3") {
    const col1 = applyVariables(block.col1Body, vars).split("\n").map(escapeHtml).join("<br />");
    const col2 = applyVariables(block.col2Body, vars).split("\n").map(escapeHtml).join("<br />");
    const col3 = applyVariables(block.col3Body, vars).split("\n").map(escapeHtml).join("<br />");
    return `
      <table width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed;">
        <tr>
          <td style="vertical-align:top;padding-right:6px;width:33.33%;">
            ${block.col1Title ? `<div style="font-size:13px;font-weight:700;color:#1A0A3D;margin-bottom:4px;">${escapeHtml(block.col1Title)}</div>` : ""}
            <div style="font-size:13px;color:#3D2F6A;line-height:1.6;">${col1}</div>
          </td>
          <td style="vertical-align:top;padding:0 6px;width:33.33%;">
            ${block.col2Title ? `<div style="font-size:13px;font-weight:700;color:#1A0A3D;margin-bottom:4px;">${escapeHtml(block.col2Title)}</div>` : ""}
            <div style="font-size:13px;color:#3D2F6A;line-height:1.6;">${col2}</div>
          </td>
          <td style="vertical-align:top;padding-left:6px;width:33.33%;">
            ${block.col3Title ? `<div style="font-size:13px;font-weight:700;color:#1A0A3D;margin-bottom:4px;">${escapeHtml(block.col3Title)}</div>` : ""}
            <div style="font-size:13px;color:#3D2F6A;line-height:1.6;">${col3}</div>
          </td>
        </tr>
      </table>`;
  }
  if (block.kind === "button-group") {
    const btns = block.buttons.map(b => {
      if (!b.href) return "";
      const bg = b.style === "primary" ? accentColor : b.style === "secondary" ? "#f3f4f6" : "transparent";
      const color = b.style === "primary" ? "#fff" : "#1A0A3D";
      const border = b.style === "outline" ? `border:1.5px solid ${escapeHtml(accentColor)};` : "";
      return `<a href="${escapeHtml(b.href)}" style="display:inline-block;padding:11px 20px;background:${escapeHtml(bg)};color:${color};text-decoration:none;border-radius:100px;font-weight:600;font-size:14px;${border}margin:0 6px 8px 0;">${escapeHtml(b.label || "Apri")}</a>`;
    }).join("");
    return `<div style="text-align:center;">${btns}</div>`;
  }
  if (block.kind === "social-links") {
    const ICONS: Record<string, string> = {
      facebook:  "f",
      instagram: "ig",
      linkedin:  "in",
      twitter:   "x",
      youtube:   "yt",
      website:   "www",
    };
    const links = block.links.map(l => {
      if (!l.url) return "";
      const label = ICONS[l.platform] ?? l.platform;
      return `<a href="${escapeHtml(l.url)}" style="display:inline-block;margin:0 5px;padding:8px 12px;background:rgba(112,96,204,0.10);color:${escapeHtml(accentColor)};text-decoration:none;border-radius:8px;font-weight:700;font-size:11px;text-transform:uppercase;">${escapeHtml(label)}</a>`;
    }).join("");
    return `<div style="text-align:center;">${links}</div>`;
  }
  if (block.kind === "text-image") {
    const content = applyVariables(block.content, vars).split("\n").map(escapeHtml).join("<br />");
    const imgCell = block.imageUrl
      ? `<td style="vertical-align:top;width:40%;${block.imagePosition === "left" ? "padding-right:16px;" : "padding-left:16px;"}">
          <img src="${escapeHtml(block.imageUrl)}" alt="${escapeHtml(block.alt ?? "")}" style="width:100%;border-radius:10px;display:block;" />
        </td>`
      : "";
    const textCell = `<td style="vertical-align:top;">
        ${block.title ? `<h3 style="margin:0 0 8px;font-size:17px;color:#1A0A3D;">${escapeHtml(block.title)}</h3>` : ""}
        <div style="font-size:14px;color:#3D2F6A;line-height:1.7;">${content}</div>
      </td>`;
    const cells = block.imagePosition === "left" ? `${imgCell}${textCell}` : `${textCell}${imgCell}`;
    return `<table width="100%" cellpadding="0" cellspacing="0"><tr>${cells}</tr></table>`;
  }
  return "";
}

export function renderBuilderContentHtml(
  payload: EmailBuilderPayload,
  vars: TemplateVariables,
  opts?: { headerPayload?: EmailBuilderPayload | null; footerPayload?: EmailBuilderPayload | null }
): string {
  const brand = payload.branding ?? DEFAULT_BRANDING;
  const headerImage = brand.headerImageUrl
    ? `<img src="${escapeHtml(brand.headerImageUrl)}" alt="header" style="width:100%;max-width:560px;border-radius:18px;display:block;margin:0 auto 18px;object-fit:cover;" />`
    : "";
  const logo = brand.logoUrl
    ? `<img src="${escapeHtml(brand.logoUrl)}" alt="logo" style="height:32px;max-width:180px;object-fit:contain;display:block;margin:0 auto 16px;" />`
    : "";

  const orgHeaderBlocks = opts?.headerPayload?.blocks ?? [];
  const orgFooterBlocks = opts?.footerPayload?.blocks ?? [];

  const SEP = '<div style="height:14px"></div>';

  const headerBlocksHtml = orgHeaderBlocks
    .map((b) => renderBlock(b, vars, brand.accentColor))
    .filter(Boolean)
    .join(SEP);

  const bodyBlocksHtml = payload.blocks
    .map((block) => renderBlock(block, vars, brand.accentColor))
    .filter(Boolean)
    .join(SEP);

  const footerBlocksHtml = orgFooterBlocks
    .map((b) => renderBlock(b, vars, brand.accentColor))
    .filter(Boolean)
    .join(SEP);

  const sections = [headerBlocksHtml, bodyBlocksHtml, footerBlocksHtml].filter(Boolean);

  return `
    <div style="font-family:${escapeHtml(brand.fontFamily)};">
      ${headerImage}
      ${logo}
      ${sections.join('<hr style="border:0;border-top:1px solid #e2e8f0;margin:18px 0;" />')}
    </div>
  `;
}

export function summarizeTemplateBody(raw: string): string {
  const builder = parseBuilderPayload(raw);
  if (!builder) return raw.slice(0, 140);
  const firstText = builder.blocks.find((b) => b.kind === "text") as TextBlock | undefined;
  if (firstText?.content) return firstText.content.slice(0, 140);
  return `${builder.blocks.length} blocchi`;
}
