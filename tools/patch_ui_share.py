# Dodaje blok UI `share` (okno edycji udostepnianej tresci) do ui.json wszystkich jezykow.
# Idempotentne: nadpisuje tylko klucze w `share`, reszte zostawia.
import json, io, sys

SHARE = {
    'pl': {
        'title': 'Udostępnij',
        'hint': 'Możesz dopisać coś od siebie albo usunąć część tekstu przed wysłaniem.',
        'includeLink': 'Zaproś do używania aplikacji',
        'cancel': 'Anuluj',
        'copy': 'Kopiuj',
        'send': 'Wyślij',
    },
    'en': {
        'title': 'Share',
        'hint': 'You can add a personal note or remove part of the text before sending.',
        'includeLink': 'Invite to use the app',
        'cancel': 'Cancel',
        'copy': 'Copy',
        'send': 'Send',
    },
    'es': {
        'title': 'Compartir',
        'hint': 'Puedes añadir una nota personal o quitar parte del texto antes de enviar.',
        'includeLink': 'Invitar a usar la aplicación',
        'cancel': 'Cancelar',
        'copy': 'Copiar',
        'send': 'Enviar',
    },
    'pt': {
        'title': 'Compartilhar',
        'hint': 'Você pode acrescentar uma mensagem pessoal ou remover parte do texto antes de enviar.',
        'includeLink': 'Convidar para usar o aplicativo',
        'cancel': 'Cancelar',
        'copy': 'Copiar',
        'send': 'Enviar',
    },
    'de': {
        'title': 'Teilen',
        'hint': 'Du kannst eine persönliche Nachricht hinzufügen oder einen Teil des Textes vor dem Senden entfernen.',
        'includeLink': 'Zur App einladen',
        'cancel': 'Abbrechen',
        'copy': 'Kopieren',
        'send': 'Senden',
    },
    'fr': {
        'title': 'Partager',
        'hint': "Vous pouvez ajouter un mot personnel ou supprimer une partie du texte avant l'envoi.",
        'includeLink': "Inviter à utiliser l'application",
        'cancel': 'Annuler',
        'copy': 'Copier',
        'send': 'Envoyer',
    },
    'sw': {
        'title': 'Shiriki',
        'hint': 'Unaweza kuongeza ujumbe wako mwenyewe au kuondoa sehemu ya maandishi kabla ya kutuma.',
        'includeLink': 'Alika kutumia programu',
        'cancel': 'Ghairi',
        'copy': 'Nakili',
        'send': 'Tuma',
    },
    'uk': {
        'title': 'Поділитися',
        'hint': 'Ви можете додати власне повідомлення або вилучити частину тексту перед надсиланням.',
        'includeLink': 'Запросити користуватися застосунком',
        'cancel': 'Скасувати',
        'copy': 'Копіювати',
        'send': 'Надіслати',
    },
}

for lang, block in SHARE.items():
    path = f'public/content/{lang}/ui.json'
    with io.open(path, encoding='utf-8') as f:
        d = json.load(f)
    cur = d.get('share') or {}
    cur.update(block)
    d['share'] = cur
    with io.open(path, 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
        f.write('\n')
    sys.stdout.write(f'OK {lang}\n')
