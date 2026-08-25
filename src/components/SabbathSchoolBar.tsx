import { useEffect, useState } from 'react'
import { useI18n } from '../i18n'
import { MenuBar } from './MenuBar'
import { fallbackUrl, findCurrentLesson, type CurrentLesson } from '../lib/sabbathSchool'

/**
 * Belka "Lekcje biblijne". Zanim czytelnik ja kliknie, w tle pytamy Adventech
 * o biezacy kwartal i tydzien - wtedy link prowadzi wprost do lekcji na ten tydzien.
 * Bez sieci (albo gdy API zamilknie) zostaje link do strony jezykowej.
 */
export function SabbathSchoolBar() {
  const { lang, t } = useI18n()
  const [lesson, setLesson] = useState<CurrentLesson | null>(null)

  useEffect(() => {
    let alive = true
    setLesson(null)
    findCurrentLesson(lang)
      .then((l) => alive && setLesson(l))
      .catch(() => {
        /* offline albo zmiana API - zostaje link zapasowy */
      })
    return () => {
      alive = false
    }
  }, [lang])

  const desc = lesson?.lessonTitle
    ? `${t('sabbathSchool.thisWeek', 'Na ten tydzień')}: ${lesson.lessonTitle}`
    : t('sabbathSchool.desc', 'Szkoła sobotnia - cotygodniowe studium Biblii (Adventech).')

  return (
    <MenuBar
      icon="📅"
      accent="emerald"
      title={t('sabbathSchool.title', 'Lekcje biblijne')}
      desc={desc}
      badge={lesson?.lessonNo ? `${t('sabbathSchool.lesson', 'Lekcja')} ${Number(lesson.lessonNo)}` : undefined}
      href={lesson?.url || fallbackUrl(lang)}
    />
  )
}
