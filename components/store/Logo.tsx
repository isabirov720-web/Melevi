import Link from "next/link";
import { Img } from "./Img";

export function Logo({ name, url, className = "" }: { name: string; url: string | null; className?: string }) {
  return (
    <Link href="/" className={`logo ${className}`} aria-label={name}>
      {url ? <Img src={url} alt={name} width={160} height={48} className="logo-img" priority /> : <span className="logo-text">{name}</span>}
    </Link>
  );
}
