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
import { GitHubMark, RedbookMark, XMark } from "@/lib/social-icons";

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
