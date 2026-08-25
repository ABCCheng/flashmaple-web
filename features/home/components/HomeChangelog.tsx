import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

type ChangelogContentBlock =
  | { type: "category"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] };

type ChangelogRelease = {
  title: string;
  blocks: ChangelogContentBlock[];
};

const CATEGORY_STYLES: Record<string, { icon: string; className: string }> = {
  added: { icon: "✨", className: "text-red-600 dark:text-red-400" },
  changed: { icon: "🔄", className: "text-blue-600 dark:text-blue-400" },
  deprecated: { icon: "⚠️", className: "text-orange-600 dark:text-orange-400" },
  removed: { icon: "🗑️", className: "text-gray-500 dark:text-gray-400" },
  fixed: { icon: "🐛", className: "text-amber-600 dark:text-amber-400" },
  security: { icon: "🔒", className: "text-green-600 dark:text-green-400" },
};

function formatReleaseTitle(title: string) {
  return title.replace(/^\[([^\]]+)\](?:\([^)]+\))?/, "$1");
}

function parseChangelog(markdown: string): ChangelogRelease[] {
  const lines = markdown.replaceAll("\r\n", "\n").split("\n");
  const releases: ChangelogRelease[] = [];
  let currentRelease: ChangelogRelease | undefined;

  for (let index = 0; index < lines.length;) {
    const line = lines[index].trim();

    if (line.startsWith("## ")) {
      currentRelease = { title: line.slice(3), blocks: [] };
      releases.push(currentRelease);
      index += 1;
      continue;
    }

    // The document preamble is useful in CHANGELOG.md, but not on the home page.
    if (!currentRelease || !line) {
      index += 1;
      continue;
    }

    if (line.startsWith("### ")) {
      currentRelease.blocks.push({ type: "category", text: line.slice(4) });
      index += 1;
      continue;
    }

    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith("- ")) {
        items.push(lines[index].trim().slice(2));
        index += 1;
      }
      currentRelease.blocks.push({ type: "list", items });
      continue;
    }

    const paragraph: string[] = [];
    while (index < lines.length) {
      const current = lines[index].trim();
      if (!current || current.startsWith("#") || current.startsWith("- ")) break;
      paragraph.push(current);
      index += 1;
    }
    if (paragraph.length > 0) {
      currentRelease.blocks.push({ type: "paragraph", text: paragraph.join(" ") });
    }
  }

  return releases;
}

function renderInlineMarkdown(value: string): ReactNode[] {
  return value.split(/(`[^`]+`|\[[^\]]+\]\([^)]+\))/g).filter(Boolean).map((token, index) => {
    if (token.startsWith("`") && token.endsWith("`")) {
      return <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.88em] text-foreground" key={index}>{token.slice(1, -1)}</code>;
    }

    const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      const [, label, href] = link;
      const external = /^https?:\/\//i.test(href);
      return <a className="font-semibold text-primary hover:underline" href={href} key={index} rel={external ? "noreferrer" : undefined} target={external ? "_blank" : undefined}>{label}</a>;
    }

    return token;
  });
}

function renderBlock(block: ChangelogContentBlock, index: number) {
  if (block.type === "category") {
    const style = CATEGORY_STYLES[block.text.trim().toLowerCase()] ?? { icon: "📌", className: "text-primary" };
    return <h4 className={`mb-3 mt-7 flex items-center gap-2 text-sm font-extrabold uppercase tracking-[0.12em] first:mt-0 ${style.className}`} key={`${block.type}-${index}`}><span aria-hidden="true">{style.icon}</span><span>{renderInlineMarkdown(block.text)}</span></h4>;
  }
  if (block.type === "list") {
    return <ul className="grid list-disc gap-2 pl-5 text-sm leading-6 text-muted-foreground sm:text-base" key={`${block.type}-${index}`}>{block.items.map((item, itemIndex) => <li key={itemIndex}>{renderInlineMarkdown(item)}</li>)}</ul>;
  }
  return <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base" key={`${block.type}-${index}`}>{renderInlineMarkdown(block.text)}</p>;
}

function ReleaseDetails({ release, initiallyOpen = false }: { release: ChangelogRelease; initiallyOpen?: boolean }) {
  return (
    <details className="group/release border-b border-border last:border-b-0" open={initiallyOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-lg font-bold tracking-[-0.02em] transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary sm:px-7 sm:py-5 sm:text-xl [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-2.5"><span aria-hidden="true">🚀</span><span>{renderInlineMarkdown(formatReleaseTitle(release.title))}</span></span>
        <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open/release:rotate-180" />
      </summary>
      <div className="max-h-[28rem] overflow-y-auto border-t border-border/70 px-5 pb-6 pt-5 sm:px-7">
        {release.blocks.map(renderBlock)}
      </div>
    </details>
  );
}

const VISIBLE_RELEASE_COUNT = 3;

export async function HomeChangelog({ earlierReleasesLabel }: { earlierReleasesLabel: string }) {
  const markdown = await readFile(join(process.cwd(), "CHANGELOG.md"), "utf8");
  const releases = parseChangelog(markdown);
  const visibleReleases = releases.slice(0, VISIBLE_RELEASE_COUNT);
  const earlierReleases = releases.slice(VISIBLE_RELEASE_COUNT);

  return (
    <div data-home-reveal className="overflow-hidden rounded-2xl border border-border bg-card/60 shadow-sm">
      {visibleReleases.map((release, index) => (
        <ReleaseDetails initiallyOpen={index === 0} key={release.title} release={release} />
      ))}
      {earlierReleases.length > 0 ? (
        <details className="group/earlier">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 bg-muted/25 px-5 py-4 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary sm:px-7 [&::-webkit-details-marker]:hidden">
            <span>{earlierReleasesLabel} <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums">{earlierReleases.length}</span></span>
            <ChevronDown aria-hidden="true" className="size-4 shrink-0 transition-transform duration-200 group-open/earlier:rotate-180" />
          </summary>
          <div className="max-h-[36rem] overflow-y-auto overscroll-contain border-t border-border">
            {earlierReleases.map((release) => <ReleaseDetails key={release.title} release={release} />)}
          </div>
        </details>
      ) : null}
    </div>
  );
}
