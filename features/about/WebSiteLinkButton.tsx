import { cn } from "@/lib/utils";
import Image from "next/image";

const FLASHMAPLE_URL = "/";
const EFFORTGO_URL = "https://www.effortgo.xyz";

export function FlashMapleLinkButton({ className }: { className?: string }) {
  return (
    <a
      href={FLASHMAPLE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("inline whitespace-nowrap text-primary hover:underline", className)}
      aria-label="FlashMaple official website"
    >
      <span
        aria-hidden="true"
        className="mr-0.5 inline-block size-4 align-[-0.2em]"
      >
        <Image
          unoptimized
          src="/logo.png"
          alt=""
          width={24}
          height={24}
          className="size-4"
        />
      </span>
      <span>FlashMaple</span>
    </a>
  );
}

export function EffortGoLinkButton({ className }: { className?: string }) {
  return (
    <a
      href={EFFORTGO_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("inline whitespace-nowrap text-primary hover:underline", className)}
      aria-label="EffortGo official website"
    >
      <span
        aria-hidden="true"
        className="mr-0.5 inline-block size-4 bg-current"
        style={{
          WebkitMask: "url('/logo-effortgo.svg') center / contain no-repeat",
          mask: "url('/logo-effortgo.svg') center / contain no-repeat",
          verticalAlign: "-0.125em",
        }}
      />
      <span>EffortGo</span>
    </a>
  );
}
