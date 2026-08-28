import { ContactForm } from '../components/ContactForm'
import { useI18n } from '../i18n'

export function Contact() {
  const { t } = useI18n()
  return <section className="mx-auto max-w-xl">
    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t('contact.title', 'Kontakt')}</h1>
    <p className="mt-2 text-slate-600 dark:text-slate-300">{t('contact.intro', 'Masz pytanie albo chcesz porozmawiać? Napisz do nas.')}</p>
    <ContactForm />
  </section>
}
