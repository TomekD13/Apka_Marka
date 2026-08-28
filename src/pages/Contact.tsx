import { ContactForm } from '../components/ContactForm'
import { useI18n } from '../i18n'
import { PageHeading } from '../components/PageHeading'

export function Contact() {
  const { t } = useI18n()
  return <section className="mx-auto max-w-xl">
    <PageHeading icon="contact" title={t('contact.title', 'Kontakt')} />
    <p className="mt-2 text-slate-600 dark:text-slate-300">{t('contact.intro', 'Masz pytanie albo chcesz porozmawiać? Napisz do nas.')}</p>
    <ContactForm />
  </section>
}
