"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Dot, FileText, Info, MessageSquare, ShieldCheck } from "lucide-react";
import { AppField, AppLoadingOverlay, AppMobileBackHeader } from "@/components/app";
import { FlashMapleLinkButton, EffortGoLinkButton } from "./WebSiteLinkButton";
import { useLocaleContext } from "@/components/providers/locale-provider";
import { showGlobalSnackbar } from "@/components/providers/snackbar-provider";
import { Button } from "@/components/ui/button";
import { feedback as submitFeedback, isValidEmail, normalizeEmail } from "@/lib/api/common";
import type { Dictionary } from "@/lib/i18n";

type AboutPanel = "privacy" | "terms" | "app" | "feedback";
type FeedbackType = "bug" | "suggestion" | "other";

const FEEDBACK_MAX_LENGTH = 1000;

const sections = {
  privacy: {
    key: "privacyPolicy",
    body: [
      ["s1Title", "s1Body"],
      ["s2Title", "s2Body"],
      ["s3Title", "s3Body"],
      ["s4Title", "s4Body"],
    ],
  },
  terms: {
    key: "termsPage",
    body: [
      ["s1Title", "s1Body"],
      ["s2Title", "s2Body"],
      ["s3Title", "s3Body"],
      ["s4Title", "s4Body"],
    ],
  },
  app: {
    key: "aboutAppPage",
    body: [
      ["s1Title", "s1Body"],
      ["s2Title", "s2Body"],
      ["s3Title", "s3Body"],
      ["s4Title", "s4Body"],
      ["s5Title", "s5Body"],
    ],
  },
} as const;

export function AboutPage() {
  const { dictionary } = useLocaleContext();
  const searchParams = useSearchParams();
  const panel = (searchParams.get("panel") || "app") as AboutPanel;

  if (panel === "feedback") {
    return <FeedbackPanel dictionary={dictionary} />;
  }

  const config = sections[panel] ?? sections.app;
  const page = dictionary[config.key as keyof Dictionary] as Record<string, string>;

  return (
    <>
      <AppMobileBackHeader title={page.title}/>
      <article className="p-4 w-full md:w-[min(100%,40rem)] mx-auto">
        <header>
          <div className="hidden md:flex py-4 items-center gap-2.5 [&_svg]:size-2xl [&_svg]:text-primary">
            {panel === "privacy" ? (
              <ShieldCheck />
            ) : null}
            {panel === "terms" ? (
              <FileText />
            ) : null}
            {panel === "app" ? (
              <Info />
            ) : null}
            <h1 className="text-2xl font-bold">{page.title}</h1>
          </div>
        </header>

        <div className="space-y-4">
          {config.body.map(([titleKey, bodyKey]) => (
            <section key={titleKey}>
              <h2 className="text-lg font-semibold">{page[titleKey]}</h2>
              <p className="mt-2 text-md leading-6 text-muted-foreground">
                {panel === "app" && titleKey === "s5Title" ? (
                  <>
                    {page[bodyKey]}{" "}
                    <FlashMapleLinkButton />{page.s5SentenceEnd}
                    <br />
                    {page.s5MoreApps}{" "}
                    <EffortGoLinkButton />{page.s5SentenceEnd}
                  </>
                ) : page[bodyKey]}
              </p>
            </section>
          ))}
        </div>
        {panel === "app" ? (
          <footer className="mt-8 pb-4 text-center text-sm text-muted-foreground md:mt-10">
            <span className="inline-flex items-center">
              © 2026 EffortGo
              <Dot aria-hidden="true" className="size-4" />
              {process.env.APP_VERSION}
            </span>
          </footer>
        ) : null}
      </article>
    </>
  );
}

function FeedbackPanel({ dictionary }: { dictionary: Dictionary }) {
  const [email, setEmail] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState<FeedbackType>("suggestion");
  const [emailError, setEmailError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  const normalizedEmail = useMemo(() => normalizeEmail(email), [email]);
  const hasContent = content.trim().length > 0;
  const isEmailValid = normalizedEmail.length === 0 || isValidEmail(normalizedEmail);
  const submitDisabled = submitting || !isEmailValid || !hasContent;

  function validateEmailInput(value: string) {
    return value && !isValidEmail(normalizeEmail(value)) ? dictionary.auth.emailError : undefined;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextEmailError = validateEmailInput(email);
    setEmailError(nextEmailError);
    if (nextEmailError || submitDisabled) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitFeedback(normalizedEmail, type, content.trim());
      if (res?.code !== 200) {
        return;
      }

      setEmail("");
      setContent("");
      setType("suggestion");
      setEmailError(undefined);
      showGlobalSnackbar(dictionary.feedbackPage.submitSuccess);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <AppMobileBackHeader title={dictionary.feedbackPage.title}/>
      <article className="p-4 w-full md:w-[min(100%,40rem)] mx-auto">
        <header className="hidden md:flex py-4 items-center gap-2.5 [&_svg]:size-2xl [&_svg]:text-primary">
          <MessageSquare />
          <h1 className="text-2xl font-bold">{dictionary.feedbackPage.title}</h1>
        </header>

        <form noValidate onSubmit={handleSubmit} className="space-y-3">
          <AppField
            value={email}
            onChange={(event) => {
              const nextEmail = event.target.value;
              setEmail(nextEmail);
              setEmailError(validateEmailInput(nextEmail));
            }}
            onClear={() => {
              setEmail("");
              setEmailError(undefined);
            }}
            disabled={submitting}
            type="email"
            autoComplete="email username"
            inputMode="email"
            placeholder={dictionary.feedbackPage.emailOptional}
            error={emailError}
          />
          <div>
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value.slice(0, FEEDBACK_MAX_LENGTH))}
              disabled={submitting}
              maxLength={FEEDBACK_MAX_LENGTH}
              placeholder={dictionary.feedbackPage.content}
              className="min-h-48 w-full rounded-lg border border-input bg-card px-3 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <div className="flex min-h-5 items-center justify-end pt-1 text-xs text-muted-foreground">
              <span>{content.length}/{FEEDBACK_MAX_LENGTH}</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              ["bug", dictionary.feedbackPage.typeBug],
              ["suggestion", dictionary.feedbackPage.typeSuggestion],
              ["other", dictionary.feedbackPage.typeOther],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setType(value as FeedbackType)}
                disabled={submitting}
                className={`h-10 rounded-lg border text-sm font-medium ${type === value ? "border-primary text-primary" : "text-muted-foreground"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <Button type="submit" className="w-full" disabled={submitDisabled}>
            {dictionary.feedbackPage.submit}
          </Button>
        </form>
      </article>
      {submitting ? <AppLoadingOverlay /> : null}
    </>
  );
}
