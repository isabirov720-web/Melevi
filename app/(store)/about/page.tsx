import type { Metadata } from "next";
import { getSettings, getT } from "@/lib/store-server";
import { tr } from "@/lib/catalog";
import { contactItems, policyItems } from "@/components/store/Footer";

export async function generateMetadata(): Promise<Metadata> {
  const [{ t, locale }, settings] = await Promise.all([getT(), getSettings()]);
  return { title: tr(settings.aboutTitle, locale) || t("about.title"), description: tr(settings.aboutText, locale).slice(0, 160) };
}

export default async function AboutPage() {
  const [{ t, locale }, settings] = await Promise.all([getT(), getSettings()]);
  const about = tr(settings.aboutText, locale);
  const contacts = contactItems(settings, locale);
  const policies = policyItems(settings, locale);
  return (
    <div className="container page narrow">
      <h1 className="page-title">{tr(settings.aboutTitle, locale) || t("about.title")}</h1>
      {about && <div className="prose lead">{about.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}</div>}

      <section id="contacts" className="section-sm" aria-labelledby="h-contacts">
        <h2 id="h-contacts" className="section-title">{t("about.contacts")}</h2>
        {contacts.length ? (
          <dl className="contact-list">
            {contacts.map((c) => (
              <div key={c.label}>
                <dt>{c.label}</dt>
                <dd>{c.href ? <a href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">{c.value}</a> : c.value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="muted">—</p>
        )}
      </section>

      <section className="section-sm" aria-labelledby="h-policies">
        <h2 id="h-policies" className="section-title">{t("about.policies")}</h2>
        {policies.length ? (
          policies.map((p) => (
            <div key={p.key} className="policy">
              <h3>{p.title}</h3>
              <p className="pre">{p.text}</p>
            </div>
          ))
        ) : (
          <p className="muted">{t("footer.policyFallback")}</p>
        )}
      </section>
    </div>
  );
}
