# -*- coding: utf-8 -*-
"""Dodaje bloki UI 'flashcards' + 'occasions' (oraz common.copied, reader.share)
do ui.json jezykow innych niz PL. Deep-merge: zachowuje istniejace klucze.
Uzycie: python tools/patch_ui_ml.py
"""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT = os.path.join(ROOT, 'public', 'content')

UI = {
 "en": {
  "common": {"copied": "Copied to clipboard"},
  "reader": {"share": "Share"},
  "flashcards": {
   "title": "Memorize Scripture",
   "intro": "Learn the 50 most important Bible texts by heart. Pick topics and practice with flashcards; texts you don't remember come back for review on the following days.",
   "cta": "Memorize Bible verses", "ctaDesc": "The 50 most important Bible texts - flashcards with spaced review.",
   "chooseThemes": "Choose topics to learn", "all": "All / none", "selectAtLeastOne": "Select at least one topic.",
   "start": "Start learning", "direction": "Direction", "dirR2T": "Reference → text", "dirT2R": "Text → reference",
   "flip": "Show answer", "flipHint": "Tap to show the answer", "g1": "Don't know", "g2": "Weak", "g3": "Good", "g4": "Know it",
   "today": "today", "dayAbbr": "d", "noRepeat": "no review", "remaining": "Remaining", "toLearn": "To learn", "learned": "Learned",
   "mastered": "Mastered", "sessionDone": "Done for today!",
   "sessionDoneDesc": "You've finished all reviews planned for today. Come back tomorrow to reinforce.",
   "practiceAll": "Practice all", "backToThemes": "Back to topics",
   "localOnly": "Your progress is saved only on this device (in the browser), with no account. Clearing browser data removes it.",
   "reset": "Clear progress", "resetConfirm": "Clear all saved learning progress?", "resetDone": "Progress cleared.",
   "ankiR2T": "AnkiDroid: Reference → Text", "ankiT2R": "AnkiDroid: Text → Reference",
   "quizlet": "Prefer Quizlet? Open the set", "onlyPl": "Available in Polish for now."
  },
  "occasions": {
   "title": "Bible verses for every occasion",
   "intro": "Choose an occasion and find fitting passages of Scripture. You can send each one to someone you love.",
   "cta": "Bible verses for every occasion", "ctaDesc": "Verses for sadness, joy, fear, sickness and much more - ready to send.",
   "share": "Share", "onlyPl": "Available in Polish for now."
  }
 },
 "es": {
  "common": {"copied": "Copiado al portapapeles"},
  "reader": {"share": "Compartir"},
  "flashcards": {
   "title": "Memoriza la Escritura",
   "intro": "Aprende de memoria los 50 textos más importantes de la Biblia. Elige temas y practica con tarjetas; los textos que no recuerdes volverán a repaso en los días siguientes.",
   "cta": "Memoriza versículos de la Biblia", "ctaDesc": "Los 50 textos más importantes de la Biblia - tarjetas con repaso espaciado.",
   "chooseThemes": "Elige temas para aprender", "all": "Todos / ninguno", "selectAtLeastOne": "Selecciona al menos un tema.",
   "start": "Empezar a aprender", "direction": "Dirección", "dirR2T": "Referencia → texto", "dirT2R": "Texto → referencia",
   "flip": "Mostrar respuesta", "flipHint": "Toca para mostrar la respuesta", "g1": "No lo sé", "g2": "Flojo", "g3": "Bien", "g4": "Lo sé",
   "today": "hoy", "dayAbbr": "d", "noRepeat": "sin repaso", "remaining": "Quedan", "toLearn": "Por aprender", "learned": "Aprendidos",
   "mastered": "Dominados", "sessionDone": "¡Listo por hoy!",
   "sessionDoneDesc": "Has terminado todos los repasos previstos para hoy. Vuelve mañana para afianzar.",
   "practiceAll": "Practicar todos", "backToThemes": "Volver a los temas",
   "localOnly": "Tu progreso se guarda solo en este dispositivo (en el navegador), sin cuenta. Borrar los datos del navegador lo elimina.",
   "reset": "Borrar progreso", "resetConfirm": "¿Borrar todo el progreso guardado?", "resetDone": "Progreso borrado.",
   "ankiR2T": "AnkiDroid: Referencia → Texto", "ankiT2R": "AnkiDroid: Texto → Referencia",
   "quizlet": "¿Prefieres Quizlet? Abre el conjunto", "onlyPl": "Disponible por ahora en polaco."
  },
  "occasions": {
   "title": "Versículos para cada ocasión",
   "intro": "Elige una ocasión y encontrarás pasajes de la Escritura adecuados. Puedes enviar cada uno a un ser querido.",
   "cta": "Versículos para cada ocasión", "ctaDesc": "Versículos para la tristeza, la alegría, el miedo, la enfermedad y mucho más - listos para enviar.",
   "share": "Compartir", "onlyPl": "Disponible por ahora en polaco."
  }
 },
 "pt": {
  "common": {"copied": "Copiado para a área de transferência"},
  "reader": {"share": "Compartilhar"},
  "flashcards": {
   "title": "Memorize a Escritura",
   "intro": "Aprenda de cor os 50 textos mais importantes da Bíblia. Escolha temas e pratique com cartões; os textos que não lembrar voltarão para revisão nos dias seguintes.",
   "cta": "Memorize versículos da Bíblia", "ctaDesc": "Os 50 textos mais importantes da Bíblia - cartões com revisão espaçada.",
   "chooseThemes": "Escolha temas para aprender", "all": "Todos / nenhum", "selectAtLeastOne": "Selecione pelo menos um tema.",
   "start": "Começar a aprender", "direction": "Direção", "dirR2T": "Referência → texto", "dirT2R": "Texto → referência",
   "flip": "Mostrar resposta", "flipHint": "Toque para mostrar a resposta", "g1": "Não sei", "g2": "Fraco", "g3": "Bem", "g4": "Sei",
   "today": "hoje", "dayAbbr": "d", "noRepeat": "sem revisão", "remaining": "Restam", "toLearn": "A aprender", "learned": "Aprendidos",
   "mastered": "Dominados", "sessionDone": "Concluído por hoje!",
   "sessionDoneDesc": "Você terminou todas as revisões previstas para hoje. Volte amanhã para fixar.",
   "practiceAll": "Praticar todos", "backToThemes": "Voltar aos temas",
   "localOnly": "O seu progresso é guardado apenas neste dispositivo (no navegador), sem conta. Limpar os dados do navegador o apaga.",
   "reset": "Limpar progresso", "resetConfirm": "Limpar todo o progresso guardado?", "resetDone": "Progresso limpo.",
   "ankiR2T": "AnkiDroid: Referência → Texto", "ankiT2R": "AnkiDroid: Texto → Referência",
   "quizlet": "Prefere o Quizlet? Abra o conjunto", "onlyPl": "Disponível por enquanto em polonês."
  },
  "occasions": {
   "title": "Versículos para cada ocasião",
   "intro": "Escolha uma ocasião e encontre passagens adequadas da Escritura. Você pode enviar cada uma a alguém querido.",
   "cta": "Versículos para cada ocasião", "ctaDesc": "Versículos para tristeza, alegria, medo, doença e muito mais - prontos para enviar.",
   "share": "Compartilhar", "onlyPl": "Disponível por enquanto em polonês."
  }
 },
 "de": {
  "common": {"copied": "In die Zwischenablage kopiert"},
  "reader": {"share": "Teilen"},
  "flashcards": {
   "title": "Bibel auswendig lernen",
   "intro": "Lerne die 50 wichtigsten Bibeltexte auswendig. Wähle Themen und übe mit Karteikarten; Texte, die du nicht behältst, kommen an den folgenden Tagen zur Wiederholung zurück.",
   "cta": "Bibelverse auswendig lernen", "ctaDesc": "Die 50 wichtigsten Bibeltexte - Karteikarten mit Wiederholung.",
   "chooseThemes": "Themen zum Lernen wählen", "all": "Alle / keine", "selectAtLeastOne": "Wähle mindestens ein Thema.",
   "start": "Lernen beginnen", "direction": "Richtung", "dirR2T": "Stelle → Text", "dirT2R": "Text → Stelle",
   "flip": "Antwort zeigen", "flipHint": "Tippen, um die Antwort zu zeigen", "g1": "Weiß nicht", "g2": "Schwach", "g3": "Gut", "g4": "Kann ich",
   "today": "heute", "dayAbbr": "T", "noRepeat": "keine Wiederholung", "remaining": "Verbleibend", "toLearn": "Zu lernen", "learned": "Gelernt",
   "mastered": "Beherrscht", "sessionDone": "Für heute fertig!",
   "sessionDoneDesc": "Du hast alle für heute geplanten Wiederholungen geschafft. Komm morgen wieder, um zu festigen.",
   "practiceAll": "Alle üben", "backToThemes": "Zurück zu den Themen",
   "localOnly": "Dein Fortschritt wird nur auf diesem Gerät (im Browser) gespeichert, ohne Konto. Das Löschen der Browserdaten entfernt ihn.",
   "reset": "Fortschritt löschen", "resetConfirm": "Den gesamten gespeicherten Lernfortschritt löschen?", "resetDone": "Fortschritt gelöscht.",
   "ankiR2T": "AnkiDroid: Stelle → Text", "ankiT2R": "AnkiDroid: Text → Stelle",
   "quizlet": "Lieber Quizlet? Set öffnen", "onlyPl": "Derzeit auf Polnisch verfügbar."
  },
  "occasions": {
   "title": "Bibeltexte für jede Gelegenheit",
   "intro": "Wähle einen Anlass und finde passende Bibelstellen. Jede kannst du einem lieben Menschen senden.",
   "cta": "Bibeltexte für jede Gelegenheit", "ctaDesc": "Verse für Trauer, Freude, Angst, Krankheit und vieles mehr - bereit zum Senden.",
   "share": "Teilen", "onlyPl": "Derzeit auf Polnisch verfügbar."
  }
 },
 "fr": {
  "common": {"copied": "Copié dans le presse-papiers"},
  "reader": {"share": "Partager"},
  "flashcards": {
   "title": "Mémoriser l'Écriture",
   "intro": "Apprends par cœur les 50 textes bibliques les plus importants. Choisis des thèmes et entraîne-toi avec des cartes ; les textes que tu ne retiens pas reviendront en révision les jours suivants.",
   "cta": "Mémoriser des versets bibliques", "ctaDesc": "Les 50 textes bibliques les plus importants - des cartes avec révision espacée.",
   "chooseThemes": "Choisis des thèmes à apprendre", "all": "Tous / aucun", "selectAtLeastOne": "Sélectionne au moins un thème.",
   "start": "Commencer à apprendre", "direction": "Sens", "dirR2T": "Référence → texte", "dirT2R": "Texte → référence",
   "flip": "Montrer la réponse", "flipHint": "Touche pour afficher la réponse", "g1": "Je ne sais pas", "g2": "Faible", "g3": "Bien", "g4": "Je sais",
   "today": "aujourd'hui", "dayAbbr": "j", "noRepeat": "sans révision", "remaining": "Restant", "toLearn": "À apprendre", "learned": "Appris",
   "mastered": "Maîtrisés", "sessionDone": "Terminé pour aujourd'hui !",
   "sessionDoneDesc": "Tu as fait toutes les révisions prévues pour aujourd'hui. Reviens demain pour consolider.",
   "practiceAll": "Tout réviser", "backToThemes": "Retour aux thèmes",
   "localOnly": "Ta progression est enregistrée uniquement sur cet appareil (dans le navigateur), sans compte. Effacer les données du navigateur la supprime.",
   "reset": "Effacer la progression", "resetConfirm": "Effacer toute la progression enregistrée ?", "resetDone": "Progression effacée.",
   "ankiR2T": "AnkiDroid : Référence → Texte", "ankiT2R": "AnkiDroid : Texte → Référence",
   "quizlet": "Tu préfères Quizlet ? Ouvre le jeu", "onlyPl": "Disponible pour l'instant en polonais."
  },
  "occasions": {
   "title": "Versets pour chaque occasion",
   "intro": "Choisis une occasion et trouve des passages bibliques adaptés. Tu peux envoyer chacun à un proche.",
   "cta": "Versets pour chaque occasion", "ctaDesc": "Des versets pour la tristesse, la joie, la peur, la maladie et bien plus - prêts à envoyer.",
   "share": "Partager", "onlyPl": "Disponible pour l'instant en polonais."
  }
 },
 "sw": {
  "common": {"copied": "Imenakiliwa"},
  "reader": {"share": "Shiriki"},
  "flashcards": {
   "title": "Kariri Maandiko",
   "intro": "Jifunze kwa moyo mistari 50 muhimu zaidi ya Biblia. Chagua mada na ufanye mazoezi kwa kadi; mistari usiyoikumbuka itarudi kwa marudio siku zinazofuata.",
   "cta": "Kariri mistari ya Biblia", "ctaDesc": "Mistari 50 muhimu zaidi ya Biblia - kadi zenye marudio.",
   "chooseThemes": "Chagua mada za kujifunza", "all": "Zote / hakuna", "selectAtLeastOne": "Chagua angalau mada moja.",
   "start": "Anza kujifunza", "direction": "Mwelekeo", "dirR2T": "Rejea → maandishi", "dirT2R": "Maandishi → rejea",
   "flip": "Onyesha jibu", "flipHint": "Gusa kuonyesha jibu", "g1": "Sijui", "g2": "Hafifu", "g3": "Vizuri", "g4": "Najua",
   "today": "leo", "dayAbbr": "s", "noRepeat": "bila marudio", "remaining": "Zilizobaki", "toLearn": "Za kujifunza", "learned": "Zilizojifunzwa",
   "mastered": "Zilizomudiwa", "sessionDone": "Imekamilika kwa leo!",
   "sessionDoneDesc": "Umemaliza marudio yote yaliyopangwa kwa leo. Rudi kesho kuimarisha.",
   "practiceAll": "Fanya mazoezi zote", "backToThemes": "Rudi kwenye mada",
   "localOnly": "Maendeleo yako yanahifadhiwa kwenye kifaa hiki tu (kwenye kivinjari), bila akaunti. Kufuta data ya kivinjari kunayaondoa.",
   "reset": "Futa maendeleo", "resetConfirm": "Kufuta maendeleo yote yaliyohifadhiwa?", "resetDone": "Maendeleo yamefutwa.",
   "ankiR2T": "AnkiDroid: Rejea → Maandishi", "ankiT2R": "AnkiDroid: Maandishi → Rejea",
   "quizlet": "Unapendelea Quizlet? Fungua seti", "onlyPl": "Kwa sasa inapatikana kwa Kipolandi."
  },
  "occasions": {
   "title": "Mistari ya Biblia kwa kila tukio",
   "intro": "Chagua tukio upate vifungu vya Maandiko vinavyofaa. Kila kimoja unaweza kumtumia mpendwa.",
   "cta": "Mistari ya Biblia kwa kila tukio", "ctaDesc": "Mistari kwa huzuni, furaha, hofu, ugonjwa na mengi zaidi - tayari kutuma.",
   "share": "Shiriki", "onlyPl": "Kwa sasa inapatikana kwa Kipolandi."
  }
 },
 "uk": {
  "common": {"copied": "Скопійовано"},
  "reader": {"share": "Поділитися"},
  "flashcards": {
   "title": "Вивчай Писання напам'ять",
   "intro": "Вивчи напам'ять 50 найважливіших біблійних текстів. Обери теми й тренуйся картками; тексти, яких не пам'ятаєш, повернуться на повторення в наступні дні.",
   "cta": "Вивчай вірші напам'ять", "ctaDesc": "50 найважливіших біблійних текстів - картки з повтореннями.",
   "chooseThemes": "Обери теми для вивчення", "all": "Усі / жодної", "selectAtLeastOne": "Познач хоча б одну тему.",
   "start": "Почати навчання", "direction": "Напрям", "dirR2T": "Посилання → текст", "dirT2R": "Текст → посилання",
   "flip": "Показати відповідь", "flipHint": "Торкніться, щоб показати відповідь", "g1": "Не знаю", "g2": "Слабко", "g3": "Добре", "g4": "Знаю",
   "today": "сьогодні", "dayAbbr": "дн.", "noRepeat": "без повторення", "remaining": "Залишилось", "toLearn": "Вивчити", "learned": "Вивчено",
   "mastered": "Опановано", "sessionDone": "На сьогодні готово!",
   "sessionDoneDesc": "Усі заплановані на сьогодні повторення позаду. Повертайся завтра, щоб закріпити.",
   "practiceAll": "Тренувати всі", "backToThemes": "Назад до тем",
   "localOnly": "Твій прогрес зберігається лише на цьому пристрої (у браузері), без облікового запису. Очищення даних браузера видалить його.",
   "reset": "Очистити прогрес", "resetConfirm": "Очистити весь збережений прогрес?", "resetDone": "Прогрес очищено.",
   "ankiR2T": "AnkiDroid: Посилання → Текст", "ankiT2R": "AnkiDroid: Текст → Посилання",
   "quizlet": "Надаєш перевагу Quizlet? Відкрий набір", "onlyPl": "Наразі доступно польською."
  },
  "occasions": {
   "title": "Біблійні тексти на кожну нагоду",
   "intro": "Обери нагоду й знайди відповідні місця Писання. Кожне можна надіслати близькій людині.",
   "cta": "Біблійні тексти на кожну нагоду", "ctaDesc": "Вірші на смуток, радість, страх, хворобу та багато іншого - готові надіслати.",
   "share": "Поділитися", "onlyPl": "Наразі доступно польською."
  }
 },
}


def deep_merge(dst, src):
    for k, v in src.items():
        if isinstance(v, dict) and isinstance(dst.get(k), dict):
            deep_merge(dst[k], v)
        else:
            dst[k] = v


def main():
    for lang, blocks in UI.items():
        p = os.path.join(CONTENT, lang, 'ui.json')
        d = json.load(open(p, encoding='utf-8'))
        deep_merge(d, blocks)
        json.dump(d, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
        print(f"[{lang}] ui.json zaktualizowany (flashcards + occasions)")


if __name__ == '__main__':
    main()
