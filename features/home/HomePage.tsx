import Image from "next/image";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  BellRing,
  Bookmark,
  Dot,
  Globe2,
  Languages,
  Mail,
  MapPin,
  Newspaper,
  Search,
  Sparkles,
} from "lucide-react";

import { HomeLanguageMenu } from "./components/HomeLanguageMenu";
import { HomeFaq } from "./components/HomeFaq";
import { HomeChangelog } from "./components/HomeChangelog";
import { HomeNavMenu } from "./components/HomeNavMenu";
import { HomeRevealObserver } from "./components/HomeRevealObserver";
import { HomeSurfaceScope } from "./components/HomeSurfaceScope";
import { HomeThemeChrome } from "./components/HomeThemeChrome";
import { HomeThemeToggle } from "./components/HomeThemeToggle";
import { Button } from "@/components/ui/button";
import { dictionaries, homePath, localizePath, type Dictionary, type Locale } from "@/lib/i18n";
import { PUBLIC_SITE_URL, SITE_NAME } from "@/lib/site";

type HomeContent = Dictionary["homePage"];

const container = "mx-auto w-full max-w-[1200px] px-4 lg:px-6";
const navLinkClass = "flex min-h-10 items-center whitespace-nowrap py-1 transition hover:text-primary";
const faqOrder = [0, 3, 1, 4, 2, 5] as const;
const discoverMoreHref = "https://www.effortgo.xyz";

export async function HomePage({ locale }: { locale: Locale }) {
  const dictionary = dictionaries[locale];
  const copy = dictionary.homePage;
  const canonicalPath = homePath("/", locale);
  const appHref = localizePath("/", locale);
  const tagline = copy.title.match(/^(.*?)\s+[-—]\s+(.*)$/)?.[2] ?? copy.footer;
  const orderedFaq = faqOrder.map((index) => copy.faq[index]);
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    description: copy.intro,
    url: `${PUBLIC_SITE_URL}${canonicalPath === "/" ? "" : canonicalPath}`,
    inLanguage: locale,
  };
  const appJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "NewsApplication",
    operatingSystem: "Web Browser",
    description: copy.intro,
    url: `${PUBLIC_SITE_URL}${appHref}`,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd).replace(/</g, "\\u003c") }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd).replace(/</g, "\\u003c") }} />
      <HomeSurfaceScope />
      <main className="relative min-h-screen overflow-x-clip bg-transparent text-foreground">
        <HomeRevealObserver instanceKey={locale} />

        <HomeThemeChrome>
          <header className="app-top-chrome sticky top-0 z-40 bg-transparent pb-2 pt-(--app-safe-header-top) md:py-[1.35rem]">
            <nav className={`${container} flex h-10 items-center justify-between gap-3 lg:gap-4`} aria-label="Main navigation">
              <Link href={homePath("/", locale)} className="inline-flex shrink-0 items-center gap-2.5 whitespace-nowrap text-xl font-bold tracking-[-0.04em] text-[#d3001c] dark:text-white" aria-label="FlashMaple home">
                <span className="grid size-10 place-items-center overflow-hidden rounded-[var(--radius-lg)] bg-[#d3001c]"><Image src="/logo.svg" alt="" width={40} height={40} /></span>
                <span>FlashMaple</span>
              </Link>

              <div className="ml-8 mr-auto hidden min-w-0 items-center gap-5 text-base font-bold text-muted-foreground xl:flex">
                <a className={navLinkClass} href="#overview">{copy.featuresKicker}</a>
                <a className={navLinkClass} href="#faq">{copy.faqNav}</a>
                <a className={navLinkClass} href="#changelog">{copy.changelogNav}</a>
                <a className={navLinkClass} href={discoverMoreHref} target="_blank" rel="noreferrer">{copy.discoverMoreNav}</a>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <HomeLanguageMenu locale={locale} />
                <HomeThemeToggle label={copy.themeLabel} />
                <Button asChild className="hidden h-10 rounded-full px-4 xl:inline-flex">
                  <Link href={appHref}>
                    {copy.launchApp}<ArrowUpRight className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
                <HomeNavMenu
                  overviewLabel={copy.featuresKicker}
                  faqLabel={copy.faqNav}
                  changelogLabel={copy.changelogNav}
                  discoverMoreLabel={copy.discoverMoreNav}
                  discoverMoreHref={discoverMoreHref}
                  launchLabel={copy.launchApp}
                  appHref={appHref}
                />
              </div>
            </nav>
          </header>
        </HomeThemeChrome>

        <section className={`${container} grid items-start justify-items-center gap-10 pb-16 pt-8 lg:min-h-[520px] lg:grid-cols-[1.1fr_0.9fr] lg:justify-items-stretch lg:gap-10 lg:pb-4`}>
          <div className="relative z-10 w-full min-w-0 max-w-xl text-center lg:text-left">
            <HeroTitle title={copy.title} />
            <p className="mx-auto mt-6 max-w-lg text-left text-base leading-7 text-muted-foreground sm:text-lg lg:mx-0">{copy.intro}</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-5 lg:justify-start">
              <Link className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-extrabold text-white shadow-xl shadow-primary/25 transition hover:-translate-y-0.5" href={appHref}>{copy.getStarted}<ArrowUpRight className="size-4" aria-hidden="true" /></Link>
              <a className="inline-flex items-center gap-1.5 text-sm font-extrabold text-foreground transition hover:text-primary" href="#overview">{copy.explore}<ArrowDownRight className="size-4" aria-hidden="true" /></a>
            </div>
          </div>
          <HeroSignalPanel copy={copy} />
        </section>

        <section className={`${container} grid grid-cols-2 gap-3 lg:grid-cols-4`} aria-label="FlashMaple at a glance">
          {copy.metrics.map((metric, index) => <MetricCard key={metric.label} metric={metric} index={index} />)}
        </section>

        <section className={`${container} pb-0 pt-20 sm:pt-28`}>
          <h2 className="mb-8 scroll-mt-[calc(var(--app-safe-header-top)+4rem)] text-3xl font-extrabold leading-tight tracking-[-0.05em] sm:mb-10 sm:text-4xl md:scroll-mt-24" id="overview">{copy.featuresKicker}</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-12">
            {copy.features.map((feature, index) => <FeatureCard key={feature.title} feature={feature} index={index} />)}
          </div>
        </section>

        <section className={`${container} py-20 sm:py-28`}>
          <h2 className="mb-8 scroll-mt-[calc(var(--app-safe-header-top)+4rem)] text-3xl font-extrabold leading-tight tracking-[-0.05em] sm:mb-10 sm:text-4xl md:scroll-mt-24" id="faq">{copy.faqNav}</h2>
          <HomeFaq items={orderedFaq} />
        </section>

        <section className={`${container} pb-20 sm:pb-28`}>
          <h2 className="mb-8 scroll-mt-[calc(var(--app-safe-header-top)+4rem)] text-3xl font-extrabold leading-tight tracking-[-0.05em] sm:mb-10 sm:text-4xl md:scroll-mt-24" id="changelog">{copy.changelogNav}</h2>
          <HomeChangelog earlierReleasesLabel={copy.changelogEarlierReleases} />
        </section>

        <footer className={`${container} flex min-h-28 flex-col items-center justify-center gap-5 border-t border-border py-7 text-center text-muted-foreground sm:flex-row sm:justify-between sm:text-left`}>
          <div className="inline-flex items-center gap-2.5"><span className="grid size-10 place-items-center overflow-hidden rounded-[var(--radius-lg)] bg-[#d3001c]"><Image src="/logo.svg" alt="" width={40} height={40} /></span><div className="grid gap-0.5 text-left"><strong className="text-sm text-[#d3001c] dark:text-white">FlashMaple</strong><span className="text-[0.65rem]">{tagline}</span></div></div>
          <div className="grid justify-items-center gap-2 text-xs sm:justify-items-end">
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 font-bold sm:justify-end">
              <Link className="hover:text-primary" href={`${appHref}/about?panel=app`}>{dictionary.profile.menu.aboutApp}</Link>
              <Link className="hover:text-primary" href={`${appHref}/about?panel=privacy`}>{copy.privacyNav}</Link>
              <Link className="hover:text-primary" href={`${appHref}/about?panel=terms`}>{copy.termsNav}</Link>
              <Link className="hover:text-primary" href={`${appHref}/about?panel=feedback`}>{dictionary.profile.menu.feedback}</Link>
            </div>
            <div className="flex items-center gap-3 text-[0.65rem]">
              <a className="transition hover:text-primary" href="https://github.com/ABCCheng/flashmaple-web" target="_blank" rel="noreferrer" aria-label="GitHub"><GitHubMark className="size-4" aria-hidden /></a>
              <a className="transition hover:text-primary" href="https://x.com/EffortGo2024" target="_blank" rel="noreferrer" aria-label="X"><XMark className="size-4" aria-hidden /></a>
              <a className="transition hover:text-primary" href="https://www.xiaohongshu.com/user/profile/5fa36065000000000101ffa5" target="_blank" rel="noreferrer" aria-label="小红书"><RedbookMark className="size-4" aria-hidden /></a>
              <a className="transition hover:text-primary" href="mailto:flashmaple@effortgo.xyz" aria-label="Email"><Mail className="size-4" aria-hidden="true" /></a>
              <span className="ml-1 inline-flex items-center">© 2026 EffortGo <Dot className="size-4" aria-hidden="true" /> {process.env.APP_VERSION}</span>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}

function HeroTitle({ title }: { title: string }) {
  const descriptor = title.match(/^(.*?)\s+[-—]\s+(.*)$/)?.[2] ?? title;
  const englishDescriptor = descriptor.match(/^(Canadian Top News)(\s+for Newcomers)$/);
  const chineseDescriptor = descriptor.match(/^(加拿大新移民)(头条资讯|頭條資訊)$/);

  return (
    <h1 className={`${englishDescriptor ? "max-w-[13ch]" : "max-w-full"} mx-auto text-[clamp(2.35rem,4.3vw,4.2rem)] font-extrabold leading-none tracking-[-0.065em] lg:mx-0`}>
      {englishDescriptor ? (
        <>
          <span className="block whitespace-nowrap">{englishDescriptor[1]}</span>
          <span className="block">{englishDescriptor[2].trim()}</span>
        </>
      ) : chineseDescriptor ? (
        <span className="inline-flex max-w-full flex-wrap lg:max-w-none lg:flex-nowrap">
          <span className="whitespace-nowrap">{chineseDescriptor[1]}</span>
          <span className="whitespace-nowrap">{chineseDescriptor[2]}</span>
        </span>
      ) : (
        descriptor
      )}
    </h1>
  );
}

function HeroSignalPanel({ copy }: { copy: HomeContent }) {
  return <div data-home-reveal data-home-reveal-delay="120" className="relative min-h-[23rem] w-full min-w-0 overflow-hidden rounded-[2rem] border border-border bg-gradient-to-br from-background via-card to-muted shadow-2xl shadow-foreground/10 dark:from-[#151d2c] dark:via-[#0f1622] dark:to-[#080c14] sm:min-h-[31rem] lg:min-h-[27rem] lg:w-[98%] lg:justify-self-end" aria-label={copy.signalLabel}>
    <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(color-mix(in_srgb,var(--foreground)_8%,transparent)_1px,transparent_1px),linear-gradient(90deg,color-mix(in_srgb,var(--foreground)_8%,transparent)_1px,transparent_1px)] [background-size:2.5rem_2.5rem] [mask-image:radial-gradient(circle_at_center,black,transparent_76%)]" />
    <div className="absolute left-1/2 top-1/2 size-52 -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-foreground/15 [transform:translate(-50%,-50%)_rotate(-22deg)] sm:size-80" /><div className="absolute left-1/2 top-1/2 h-44 w-72 -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-foreground/15 [transform:translate(-50%,-50%)_rotate(24deg)] sm:h-64 sm:w-[28rem]" />
    <div className="absolute inset-[8%_11%] rotate-[-8deg] opacity-70"><span className="absolute left-[5%] top-[26%] h-px w-3/4 rotate-[18deg] bg-gradient-to-r from-transparent via-sky-400/80 to-primary/40" /><span className="absolute left-[20%] top-[52%] h-px w-[70%] rotate-[-17deg] bg-gradient-to-r from-transparent via-sky-400/80 to-primary/40" /><span className="absolute left-[10%] top-[66%] h-px w-[84%] rotate-[31deg] bg-gradient-to-r from-transparent via-sky-400/80 to-primary/40" /><i className="absolute left-[18%] top-[31%] size-2 rounded-full border-2 border-sky-400 bg-background shadow-[0_0_0_5px_rgb(56_189_248_/_18%),0_0_20px_rgb(56_189_248_/_60%)]" /><i className="absolute left-[71%] top-[44%] size-2 rounded-full border-2 border-primary bg-background shadow-[0_0_0_5px_rgb(211_0_28_/_18%),0_0_20px_rgb(211_0_28_/_60%)]" /><i className="absolute left-[36%] top-[67%] size-2 rounded-full border-2 border-sky-400 bg-background" /></div>
    <div className="absolute left-[8%] top-[19%] z-10 w-[68%] rounded-2xl border border-border bg-card/90 p-3.5 text-card-foreground shadow-2xl backdrop-blur-xl sm:left-[17%] sm:top-[20%]"><div className="flex items-center gap-2 text-[0.62rem] tracking-[0.08em] text-muted-foreground"><span className="size-1.5 rounded-full bg-lime-500 shadow-[0_0_0_4px_rgb(132_204_22_/_15%)]" />{copy.liveLabel}<span className="ml-auto">09:42</span></div><div className="mt-4 text-xl font-extrabold tracking-[-0.06em] sm:text-3xl">Good morning, Toronto.</div><p className="my-2.5 text-[0.72rem] text-muted-foreground">6 stories · 2 transit alerts · 1 new briefing</p><div className="flex h-10 items-end gap-1.5">{[45, 75, 56, 100, 68].map((height) => <i className="block w-2 rounded-full bg-gradient-to-b from-primary/50 to-primary" style={{ height: `${height}%` }} key={height} />)}</div></div>
    <div className="absolute right-[5%] top-[6%] z-10 flex items-center gap-2 rounded-xl border border-border bg-card/90 px-3 py-2 text-card-foreground shadow-xl backdrop-blur-xl sm:right-[10%] sm:top-[10%]"><BellRing className="size-4 text-primary" /><div className="grid gap-0.5"><small className="text-[0.58rem] text-muted-foreground">{copy.pushLabel}</small><strong className="text-xs">New local update</strong></div><span className="ml-1 text-[0.58rem] font-bold text-lime-600">now</span></div>
    <div className="absolute bottom-[12%] right-[5%] z-10 flex w-[68%] items-center gap-2.5 rounded-xl border border-border bg-card/90 p-3 text-card-foreground shadow-xl backdrop-blur-xl sm:bottom-[17%] sm:right-[7%] sm:w-3/5"><span className="grid size-8 place-items-center rounded-lg bg-sky-500/15 text-sky-500"><Newspaper className="size-4" /></span><div className="grid gap-0.5"><small className="text-[0.58rem] text-muted-foreground">{copy.topStory}</small><strong className="text-xs">Across the city, today</strong></div><ArrowUpRight className="ml-auto size-4 text-primary" /></div>
    <div className="absolute bottom-[5%] left-[5%] z-10 inline-flex items-center gap-2 rounded-full border border-border bg-card/85 px-3 py-2 text-[0.59rem] font-bold text-card-foreground backdrop-blur-xl sm:bottom-[7%] sm:left-[7%]"><Languages className="size-3.5 text-sky-500" /><span>EN</span><span>中文</span><span>FR</span></div><div className="absolute right-[5%] top-[43%] z-10 inline-flex items-center gap-2 rounded-full border border-border bg-card/85 px-3 py-2 text-[0.59rem] font-bold text-card-foreground backdrop-blur-xl sm:right-[8%]"><Globe2 className="size-3.5 text-sky-500" />Canada / 07</div>
  </div>;
}

function MetricCard({ metric, index }: { metric: HomeContent["metrics"][number]; index: number }) {
  const MetricIcon = [Languages, MapPin, Newspaper, BellRing][index] ?? Sparkles;
  const accent = [
    { text: "text-primary", glow: "bg-primary/20" },
    { text: "text-sky-500", glow: "bg-sky-500/20" },
    { text: "text-lime-600", glow: "bg-lime-500/20" },
    { text: "text-orange-500", glow: "bg-orange-500/20" },
  ][index] ?? { text: "text-primary", glow: "bg-primary/20" };
  return <div data-home-reveal data-home-reveal-delay={String(index * 70)} className="relative flex min-h-[5.5rem] items-center gap-3 overflow-hidden rounded-2xl border border-border bg-card/70 px-3.5 py-3.5 sm:min-h-[6.6rem] sm:px-5"><span className={`grid size-11 shrink-0 place-items-center rounded-2xl sm:size-14 ${accent.glow} ${accent.text}`}><MetricIcon className="size-6 sm:size-7" strokeWidth={2.2} aria-hidden="true" /></span><div className="relative z-10 grid gap-1"><strong className={`whitespace-nowrap text-2xl leading-none tracking-[-0.08em] sm:text-3xl ${accent.text}`}>{metric.value === "24/7" ? <><span>24</span><span className="mx-1">/</span><span>7</span></> : metric.value}</strong><span className="text-[0.65rem] font-bold text-muted-foreground sm:text-xs">{metric.label}</span></div><span className={`absolute -bottom-8 -right-8 size-24 rounded-full blur-2xl ${accent.glow}`} /> </div>;
}

function FeatureCard({ feature, index }: { feature: HomeContent["features"][number]; index: number }) {
  const Icon = [Newspaper, Search, MapPin, Languages, BellRing, Bookmark][index] ?? Sparkles;
  const isWide = index === 0 || index === 3;
  const responsiveOrder = ["order-1", "order-3", "order-4", "order-2", "order-5", "order-6"][index] ?? "";
  const label = feature.eyebrow.replace(/^\d+\s*\/\s*/, "");
  const accent = {
    red: { text: "text-primary", glow: "bg-primary/15" },
    blue: { text: "text-sky-500", glow: "bg-sky-500/15" },
    lime: { text: "text-lime-600", glow: "bg-lime-500/15" },
    orange: { text: "text-orange-500", glow: "bg-orange-500/15" },
  }[feature.accent as "red" | "blue" | "lime" | "orange"] ?? { text: "text-primary", glow: "bg-primary/15" };
  return <article data-home-reveal data-home-reveal-delay={String((index % 3) * 80)} className={`group relative flex min-h-[14.5rem] flex-col overflow-hidden rounded-2xl border border-border bg-card/70 p-5 transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-2xl hover:shadow-foreground/10 ${responsiveOrder} lg:order-none ${isWide ? "lg:col-span-6 sm:p-6" : "lg:col-span-3"}`}>
    {isWide ? <Icon className={`pointer-events-none absolute -right-5 -top-6 size-36 opacity-[0.06] sm:size-44 ${accent.text}`} strokeWidth={1.25} aria-hidden="true" /> : null}
    <div className="relative z-10 flex items-center gap-3">
      <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${accent.glow} ${accent.text}`}><Icon className="size-5" strokeWidth={2.2} aria-hidden="true" /></span>
      <span className={`text-lg font-extrabold uppercase tracking-[0.025em] ${accent.text}`}>{label}</span>
    </div>
    <h3 className={`relative z-10 mt-6 text-xl font-extrabold leading-[1.08] tracking-[-0.045em] ${isWide ? "lg:max-w-[18ch] lg:text-3xl" : ""}`}>{feature.title}</h3>
    <p className={`relative z-10 mt-3 text-sm leading-6 text-muted-foreground ${isWide ? "max-w-md" : "max-w-xs"}`}>{feature.body}</p>
    <div className="relative z-10 mt-auto flex flex-wrap gap-2 pt-5">
      {feature.tags.map((tag) => <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-extrabold ${accent.glow} ${accent.text}`} key={tag}>{tag}</span>)}
    </div>
    <span className={`pointer-events-none absolute -bottom-16 -right-12 size-40 rounded-full opacity-80 blur-3xl ${accent.glow}`} />
  </article>;
}

function XMark({ className }: { className?: string; "aria-hidden"?: boolean }) {
  return (
    <svg aria-hidden={true} className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.9 2h3.3l-7.2 8.24L23.5 22h-6.64l-5.2-6.8L5.72 22H2.4l7.7-8.8L2 2h6.8l4.7 6.21L18.9 2Zm-1.16 17.93h1.83L7.81 3.96H5.85l11.89 15.97Z" />
    </svg>
  );
}

function GitHubMark({ className }: { className?: string; "aria-hidden"?: boolean }) {
  return (
    <svg aria-hidden={true} className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 .7a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2.23c-3.22.7-3.9-1.37-3.9-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.71.08-.71 1.17.08 1.78 1.2 1.78 1.2 1.04 1.77 2.72 1.26 3.38.96.1-.75.4-1.26.74-1.55-2.57-.29-5.27-1.28-5.27-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.16 1.18a10.97 10.97 0 0 1 5.75 0c2.2-1.49 3.16-1.18 3.16-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.71 5.38-5.29 5.67.42.36.79 1.06.79 2.14v3.17c0 .31.21.67.79.56A11.5 11.5 0 0 0 12 .7Z" />
    </svg>
  );
}

function RedbookMark({ className }: { className?: string; "aria-hidden"?: boolean }) {
  return (
    <svg aria-hidden={true} className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M22.405 9.879c.002.016.01.02.07.019h.725a.797.797 0 0 0 .78-.972a.794.794 0 0 0-.884-.618.795.795 0 0 0-.692.794c0 .101-.002.666.001.777m-11.509 4.808c-.203.001-1.353.004-1.685.003a2.5 2.5 0 0 1-.766-.126.025.025 0 0 0-.03.014L7.7 16.127a.025.025 0 0 0 .01.032c.111.06.336.124.495.124c.66.01 1.32.002 1.981 0q.017 0 .023-.015l.712-1.545a.025.025 0 0 0-.024-.036ZM.477 9.91c-.071 0-.076.002-.076.01l-.01.08c-.027.397-.038.495-.234 3.06c-.012.24-.034.389-.135.607c-.026.057-.033.042.003.112c.046.092.681 1.523.787 1.74c.008.015.011.02.017.02c.008 0 .033-.026.047-.044q.219-.282.371-.606c.306-.635.44-1.325.486-1.706c.014-.11.021-.22.03-.33l.204-2.616l.022-.293c.003-.029 0-.033-.03-.034zm7.203 3.757a1.4 1.4 0 0 1-.135-.607c-.004-.084-.031-.39-.235-3.06a.4.4 0 0 0-.01-.082c-.004-.011-.052-.008-.076-.008h-1.48c-.03.001-.034.005-.03.034l.021.293q.114 1.473.233 2.946c.05.4.186 1.085.487 1.706c.103.215.223.419.37.606c.015.018.037.051.048.049c.02-.003.742-1.642.804-1.765c.036-.07.03-.055.003-.112m3.861-.913h-.872a.126.126 0 0 1-.116-.178l1.178-2.625a.025.025 0 0 0-.023-.035l-1.318-.003a.148.148 0 0 1-.135-.21l.876-1.954a.025.025 0 0 0-.023-.035h-1.56q-.017 0-.024.015l-.926 2.068c-.085.169-.314.634-.399.938a.5.5 0 0 0-.02.191a.46.46 0 0 0 .23.378a1 1 0 0 0 .46.119h.59c.041 0-.688 1.482-.834 1.972a.5.5 0 0 0-.023.172a.47.47 0 0 0 .23.398c.15.092.342.12.475.12l1.66-.001q.017 0 .023-.015l.575-1.28a.025.025 0 0 0-.024-.035m-6.93-4.937H3.1a.032.032 0 0 0-.034.033c0 1.048-.01 2.795-.01 6.829c0 .288-.269.262-.28.262h-.74c-.04.001-.044.004-.04.047c.001.037.465 1.064.555 1.263c.01.02.03.033.051.033c.157.003.767.009.938-.014c.153-.02.3-.06.438-.132c.3-.156.49-.419.595-.765c.052-.172.075-.353.075-.533q.003-3.495-.007-6.991a.03.03 0 0 0-.032-.032zm11.784 6.896q-.002-.02-.024-.022h-1.465c-.048-.001-.049-.002-.05-.049v-4.66c0-.072-.005-.07.07-.07h.863c.08 0 .075.004.075-.074V8.393c0-.082.006-.076-.08-.076h-3.5c-.064 0-.075-.006-.075.073v1.445c0 .083-.006.077.08.077h.854c.075 0 .07-.004.07.07v4.624c0 .095.008.084-.085.084c-.37 0-1.11-.002-1.304 0c-.048.001-.06.03-.06.03l-.697 1.519s-.014.025-.008.036s.013.008.058.008q2.622.003 5.243.002c.03-.001.034-.006.035-.033zm4.177-3.43q0 .021-.02.024c-.346.006-.692.004-1.037.004q-.021-.003-.022-.024q-.006-.651-.01-1.303c0-.072-.006-.071.07-.07l.733-.003c.041 0 .081.002.12.015c.093.025.16.107.165.204c.006.431.002 1.153.001 1.153m2.67.244a1.95 1.95 0 0 0-.883-.222h-.18c-.04-.001-.04-.003-.042-.04V10.21q.001-.198-.025-.394a1.8 1.8 0 0 0-.153-.53a1.53 1.53 0 0 0-.677-.71a2.2 2.2 0 0 0-1-.258c-.153-.003-.567 0-.72 0c-.07 0-.068.004-.068-.065V7.76c0-.031-.01-.041-.046-.039H17.93s-.016 0-.023.007q-.008.008-.008.023v.546c-.008.036-.057.015-.082.022h-.95c-.022.002-.028.008-.03.032v1.481c0 .09-.004.082.082.082h.913c.082 0 .072.128.072.128v1.148s.003.117-.06.117h-1.482c-.068 0-.06.082-.06.082v1.445s-.01.068.064.068h1.457c.082 0 .076-.006.076.079v3.225c0 .088-.007.081.082.081h1.43c.09 0 .082.007.082-.08v-3.27c0-.029.006-.035.033-.035l2.323-.003a.7.7 0 0 1 .28.061a.46.46 0 0 1 .274.407c.008.395.003.79.003 1.185c0 .259-.107.367-.33.367h-1.218c-.023.002-.029.008-.028.033q.276.655.57 1.303a.05.05 0 0 0 .04.026c.17.005.34.002.51.003c.15-.002.517.004.666-.01a2 2 0 0 0 .408-.075c.59-.18.975-.698.976-1.313v-1.981q.001-.191-.034-.38c0 .078-.029-.641-.724-.998" />
    </svg>
  );
}
