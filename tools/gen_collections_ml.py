# -*- coding: utf-8 -*-
"""Generuje flashcards.json + occasions.json dla jezykow innych niz PL.
Struktura/osis/ids/icons brane z PL (kanoniczne). Tlumaczone: nazwy tematow/kategorii.
Odnosniki (ref) generowane z osis: standardowa nazwa ksiegi danego jezyka + numer,
z offsetem psalmow dla de/fr/uk (numeracja hebrajska; offset = wersety_hebr - KJV).
Quizlet: tylko EN. Uzycie: python tools/gen_collections_ml.py
"""
import json, os, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT = os.path.join(ROOT, 'public', 'content')
LANGS = ['en', 'es', 'pt', 'de', 'fr', 'sw', 'uk']
HEBREW = {'de', 'fr', 'uk'}                 # numeracja psalmow hebrajska -> offset w ref
SEP = {'de': ','}                            # separator rozdzial/werset; reszta ':'
BIBLE = {'en': 'WEB', 'es': 'RV1909', 'pt': 'ALMEIDA', 'de': 'SCHL1951', 'fr': 'LS1910', 'sw': 'NENO', 'uk': 'UBIO'}
QUIZLET = {'en': 'https://quizlet.com/pl/459183715/top50-bible-texts-niv-flash-cards'}

FC_TITLE = {'en': 'Bible - 50 key texts', 'es': 'Biblia - 50 textos clave', 'pt': 'Bíblia - 50 textos-chave',
            'de': 'Bibel - 50 Schlüsseltexte', 'fr': 'Bible - 50 textes clés', 'sw': 'Biblia - mistari 50 muhimu',
            'uk': 'Біблія - 50 ключових текстів'}
OC_TITLE = {'en': 'Bible verses for every occasion', 'es': 'Versículos para cada ocasión',
            'pt': 'Versículos para cada ocasião', 'de': 'Bibeltexte für jede Gelegenheit',
            'fr': 'Versets pour chaque occasion', 'sw': 'Mistari ya Biblia kwa kila tukio',
            'uk': 'Біблійні тексти на кожну нагоду'}

THEMES = {
    'en': {'wielki-boj': 'Salvation history', 'zbawienie': 'Salvation by grace', 'jezus': 'Who is Jesus',
           'powtorne-przyjscie': 'The second coming of Jesus', 'szabat': 'The day of rest', 'prawo': "God's law",
           'smierc': 'Death and resurrection', 'j316': 'John 3:16'},
    'es': {'wielki-boj': 'Historia de la salvación', 'zbawienie': 'La salvación por gracia', 'jezus': '¿Quién es Jesús?',
           'powtorne-przyjscie': 'La segunda venida de Jesús', 'szabat': 'El día de descanso', 'prawo': 'La ley de Dios',
           'smierc': 'Muerte y resurrección', 'j316': 'Juan 3:16'},
    'pt': {'wielki-boj': 'História da salvação', 'zbawienie': 'A salvação pela graça', 'jezus': 'Quem é Jesus',
           'powtorne-przyjscie': 'A segunda vinda de Jesus', 'szabat': 'O dia de descanso', 'prawo': 'A lei de Deus',
           'smierc': 'Morte e ressurreição', 'j316': 'João 3:16'},
    'de': {'wielki-boj': 'Heilsgeschichte', 'zbawienie': 'Erlösung aus Gnade', 'jezus': 'Wer ist Jesus',
           'powtorne-przyjscie': 'Die Wiederkunft Jesu', 'szabat': 'Der Ruhetag', 'prawo': 'Gottes Gebote',
           'smierc': 'Tod und Auferstehung', 'j316': 'Johannes 3,16'},
    'fr': {'wielki-boj': "L'histoire du salut", 'zbawienie': 'Le salut par la grâce', 'jezus': 'Qui est Jésus',
           'powtorne-przyjscie': 'Le retour de Jésus', 'szabat': 'Le jour du repos', 'prawo': 'La loi de Dieu',
           'smierc': 'Mort et résurrection', 'j316': 'Jean 3:16'},
    'sw': {'wielki-boj': 'Historia ya wokovu', 'zbawienie': 'Wokovu kwa neema', 'jezus': 'Yesu ni nani',
           'powtorne-przyjscie': 'Kuja mara ya pili kwa Yesu', 'szabat': 'Siku ya mapumziko', 'prawo': 'Sheria ya Mungu',
           'smierc': 'Kifo na ufufuo', 'j316': 'Yohana 3:16'},
    'uk': {'wielki-boj': 'Історія спасіння', 'zbawienie': 'Спасіння благодаттю', 'jezus': 'Хто такий Ісус',
           'powtorne-przyjscie': 'Друге пришестя Ісуса', 'szabat': 'День спокою', 'prawo': 'Божий Закон',
           'smierc': 'Смерть і воскресіння', 'j316': 'Іван 3:16'},
}

CATS = {
    'en': {'pocieszenie': 'Comfort and hard times', 'smutek': 'Sadness and grief', 'lek': 'Fear and anxiety',
           'pokoj': 'Peace of heart', 'nadzieja': 'Hope', 'radosc': 'Joy and gratitude', 'zaufanie': 'Trust in God',
           'samotnosc': 'Loneliness', 'choroba': 'Sickness and healing', 'przebaczenie': 'Forgiveness',
           'madrosc': 'Wisdom and decisions', 'milosc-boza': "God's love", 'stres': 'Stress and overwhelm',
           'depresja': 'Discouragement and depression', 'ochrona': 'Protection and travel', 'burze': "Life's storms",
           'pokusa': 'Temptation', 'nowy-poczatek': 'A new beginning', 'cierpliwosc': 'Patience and perseverance',
           'modlitwa': 'Prayer', 'odwaga': 'Courage and strength', 'slub': 'Wedding', 'pogrzeb': 'Funeral and condolences',
           'narodziny-dziecka': 'Birth of a child', 'urodziny': 'Birthday'},
    'es': {'pocieszenie': 'Consuelo y momentos difíciles', 'smutek': 'Tristeza y duelo', 'lek': 'Miedo y ansiedad',
           'pokoj': 'Paz del corazón', 'nadzieja': 'Esperanza', 'radosc': 'Gozo y gratitud', 'zaufanie': 'Confianza en Dios',
           'samotnosc': 'Soledad', 'choroba': 'Enfermedad y sanidad', 'przebaczenie': 'Perdón',
           'madrosc': 'Sabiduría y decisiones', 'milosc-boza': 'El amor de Dios', 'stres': 'Estrés y agobio',
           'depresja': 'Desánimo y depresión', 'ochrona': 'Protección y viaje', 'burze': 'Tormentas de la vida',
           'pokusa': 'Tentación', 'nowy-poczatek': 'Un nuevo comienzo', 'cierpliwosc': 'Paciencia y perseverancia',
           'modlitwa': 'Oración', 'odwaga': 'Valor y fortaleza', 'slub': 'Boda', 'pogrzeb': 'Funeral y condolencias',
           'narodziny-dziecka': 'Nacimiento de un hijo', 'urodziny': 'Cumpleaños'},
    'pt': {'pocieszenie': 'Consolo e momentos difíceis', 'smutek': 'Tristeza e luto', 'lek': 'Medo e ansiedade',
           'pokoj': 'Paz no coração', 'nadzieja': 'Esperança', 'radosc': 'Alegria e gratidão', 'zaufanie': 'Confiança em Deus',
           'samotnosc': 'Solidão', 'choroba': 'Doença e cura', 'przebaczenie': 'Perdão',
           'madrosc': 'Sabedoria e decisões', 'milosc-boza': 'O amor de Deus', 'stres': 'Estresse e sobrecarga',
           'depresja': 'Desânimo e depressão', 'ochrona': 'Proteção e viagem', 'burze': 'Tempestades da vida',
           'pokusa': 'Tentação', 'nowy-poczatek': 'Um novo começo', 'cierpliwosc': 'Paciência e perseverança',
           'modlitwa': 'Oração', 'odwaga': 'Coragem e força', 'slub': 'Casamento', 'pogrzeb': 'Funeral e condolências',
           'narodziny-dziecka': 'Nascimento de um filho', 'urodziny': 'Aniversário'},
    'de': {'pocieszenie': 'Trost und schwere Zeiten', 'smutek': 'Trauer und Verlust', 'lek': 'Angst und Sorge',
           'pokoj': 'Frieden im Herzen', 'nadzieja': 'Hoffnung', 'radosc': 'Freude und Dankbarkeit', 'zaufanie': 'Vertrauen auf Gott',
           'samotnosc': 'Einsamkeit', 'choroba': 'Krankheit und Heilung', 'przebaczenie': 'Vergebung',
           'madrosc': 'Weisheit und Entscheidungen', 'milosc-boza': 'Gottes Liebe', 'stres': 'Stress und Überforderung',
           'depresja': 'Niedergeschlagenheit und Depression', 'ochrona': 'Schutz und Reise', 'burze': 'Stürme des Lebens',
           'pokusa': 'Versuchung', 'nowy-poczatek': 'Ein neuer Anfang', 'cierpliwosc': 'Geduld und Ausdauer',
           'modlitwa': 'Gebet', 'odwaga': 'Mut und Stärke', 'slub': 'Hochzeit', 'pogrzeb': 'Beerdigung und Beileid',
           'narodziny-dziecka': 'Geburt eines Kindes', 'urodziny': 'Geburtstag'},
    'fr': {'pocieszenie': 'Réconfort et temps difficiles', 'smutek': 'Tristesse et deuil', 'lek': 'Peur et anxiété',
           'pokoj': 'La paix du cœur', 'nadzieja': 'Espérance', 'radosc': 'Joie et gratitude', 'zaufanie': 'Confiance en Dieu',
           'samotnosc': 'Solitude', 'choroba': 'Maladie et guérison', 'przebaczenie': 'Pardon',
           'madrosc': 'Sagesse et décisions', 'milosc-boza': "L'amour de Dieu", 'stres': 'Stress et accablement',
           'depresja': 'Découragement et dépression', 'ochrona': 'Protection et voyage', 'burze': 'Les tempêtes de la vie',
           'pokusa': 'Tentation', 'nowy-poczatek': 'Un nouveau départ', 'cierpliwosc': 'Patience et persévérance',
           'modlitwa': 'Prière', 'odwaga': 'Courage et force', 'slub': 'Mariage', 'pogrzeb': 'Funérailles et condoléances',
           'narodziny-dziecka': "Naissance d'un enfant", 'urodziny': 'Anniversaire'},
    'sw': {'pocieszenie': 'Faraja na nyakati ngumu', 'smutek': 'Huzuni na maombolezo', 'lek': 'Hofu na wasiwasi',
           'pokoj': 'Amani ya moyo', 'nadzieja': 'Tumaini', 'radosc': 'Furaha na shukrani', 'zaufanie': 'Kumtumaini Mungu',
           'samotnosc': 'Upweke', 'choroba': 'Ugonjwa na uponyaji', 'przebaczenie': 'Msamaha',
           'madrosc': 'Hekima na maamuzi', 'milosc-boza': 'Upendo wa Mungu', 'stres': 'Msongo wa mawazo',
           'depresja': 'Kukata tamaa na huzuni', 'ochrona': 'Ulinzi na safari', 'burze': 'Dhoruba za maisha',
           'pokusa': 'Majaribu', 'nowy-poczatek': 'Mwanzo mpya', 'cierpliwosc': 'Subira na uvumilivu',
           'modlitwa': 'Maombi', 'odwaga': 'Ujasiri na nguvu', 'slub': 'Harusi', 'pogrzeb': 'Mazishi na rambirambi',
           'narodziny-dziecka': 'Kuzaliwa kwa mtoto', 'urodziny': 'Siku ya kuzaliwa'},
    'uk': {'pocieszenie': 'Утіха і важкі хвилини', 'smutek': 'Смуток і жалоба', 'lek': 'Страх і тривога',
           'pokoj': 'Мир у серці', 'nadzieja': 'Надія', 'radosc': 'Радість і вдячність', 'zaufanie': 'Довіра до Бога',
           'samotnosc': 'Самотність', 'choroba': 'Хвороба і зцілення', 'przebaczenie': 'Прощення',
           'madrosc': 'Мудрість і рішення', 'milosc-boza': 'Божа любов', 'stres': 'Стрес і перевантаження',
           'depresja': 'Зневіра і депресія', 'ochrona': 'Захист і подорож', 'burze': 'Життєві бурі',
           'pokusa': 'Спокуса', 'nowy-poczatek': 'Новий початок', 'cierpliwosc': 'Терпіння і витривалість',
           'modlitwa': 'Молитва', 'odwaga': 'Мужність і сила', 'slub': 'Весілля', 'pogrzeb': 'Похорон і співчуття',
           'narodziny-dziecka': 'Народження дитини', 'urodziny': 'День народження'},
}

BOOKS = {
    'en': {'Gen': 'Genesis', 'Exod': 'Exodus', 'Num': 'Numbers', 'Deut': 'Deuteronomy', 'Josh': 'Joshua', 'Ruth': 'Ruth',
           '1Sam': '1 Samuel', 'Neh': 'Nehemiah', 'Job': 'Job', 'Ps': 'Psalm', 'Prov': 'Proverbs', 'Eccl': 'Ecclesiastes',
           'Song': 'Song of Songs', 'Isa': 'Isaiah', 'Jer': 'Jeremiah', 'Lam': 'Lamentations', 'Ezek': 'Ezekiel',
           'Dan': 'Daniel', 'Mic': 'Micah', 'Nah': 'Nahum', 'Hab': 'Habakkuk', 'Zeph': 'Zephaniah', 'Mal': 'Malachi',
           'Matt': 'Matthew', 'Mark': 'Mark', 'Luke': 'Luke', 'John': 'John', 'Acts': 'Acts', 'Rom': 'Romans',
           '1Cor': '1 Corinthians', '2Cor': '2 Corinthians', 'Gal': 'Galatians', 'Eph': 'Ephesians', 'Phil': 'Philippians',
           'Col': 'Colossians', '1Thess': '1 Thessalonians', '2Thess': '2 Thessalonians', '2Tim': '2 Timothy',
           'Titus': 'Titus', 'Heb': 'Hebrews', 'Jas': 'James', '1Pet': '1 Peter', '2Pet': '2 Peter', '1John': '1 John',
           '3John': '3 John', 'Jude': 'Jude', 'Rev': 'Revelation'},
    'es': {'Gen': 'Génesis', 'Exod': 'Éxodo', 'Num': 'Números', 'Deut': 'Deuteronomio', 'Josh': 'Josué', 'Ruth': 'Rut',
           '1Sam': '1 Samuel', 'Neh': 'Nehemías', 'Job': 'Job', 'Ps': 'Salmo', 'Prov': 'Proverbios', 'Eccl': 'Eclesiastés',
           'Song': 'Cantares', 'Isa': 'Isaías', 'Jer': 'Jeremías', 'Lam': 'Lamentaciones', 'Ezek': 'Ezequiel',
           'Dan': 'Daniel', 'Mic': 'Miqueas', 'Nah': 'Nahúm', 'Hab': 'Habacuc', 'Zeph': 'Sofonías', 'Mal': 'Malaquías',
           'Matt': 'Mateo', 'Mark': 'Marcos', 'Luke': 'Lucas', 'John': 'Juan', 'Acts': 'Hechos', 'Rom': 'Romanos',
           '1Cor': '1 Corintios', '2Cor': '2 Corintios', 'Gal': 'Gálatas', 'Eph': 'Efesios', 'Phil': 'Filipenses',
           'Col': 'Colosenses', '1Thess': '1 Tesalonicenses', '2Thess': '2 Tesalonicenses', '2Tim': '2 Timoteo',
           'Titus': 'Tito', 'Heb': 'Hebreos', 'Jas': 'Santiago', '1Pet': '1 Pedro', '2Pet': '2 Pedro', '1John': '1 Juan',
           '3John': '3 Juan', 'Jude': 'Judas', 'Rev': 'Apocalipsis'},
    'pt': {'Gen': 'Gênesis', 'Exod': 'Êxodo', 'Num': 'Números', 'Deut': 'Deuteronômio', 'Josh': 'Josué', 'Ruth': 'Rute',
           '1Sam': '1 Samuel', 'Neh': 'Neemias', 'Job': 'Jó', 'Ps': 'Salmo', 'Prov': 'Provérbios', 'Eccl': 'Eclesiastes',
           'Song': 'Cânticos', 'Isa': 'Isaías', 'Jer': 'Jeremias', 'Lam': 'Lamentações', 'Ezek': 'Ezequiel',
           'Dan': 'Daniel', 'Mic': 'Miquéias', 'Nah': 'Naum', 'Hab': 'Habacuque', 'Zeph': 'Sofonias', 'Mal': 'Malaquias',
           'Matt': 'Mateus', 'Mark': 'Marcos', 'Luke': 'Lucas', 'John': 'João', 'Acts': 'Atos', 'Rom': 'Romanos',
           '1Cor': '1 Coríntios', '2Cor': '2 Coríntios', 'Gal': 'Gálatas', 'Eph': 'Efésios', 'Phil': 'Filipenses',
           'Col': 'Colossenses', '1Thess': '1 Tessalonicenses', '2Thess': '2 Tessalonicenses', '2Tim': '2 Timóteo',
           'Titus': 'Tito', 'Heb': 'Hebreus', 'Jas': 'Tiago', '1Pet': '1 Pedro', '2Pet': '2 Pedro', '1John': '1 João',
           '3John': '3 João', 'Jude': 'Judas', 'Rev': 'Apocalipse'},
    'de': {'Gen': '1. Mose', 'Exod': '2. Mose', 'Num': '4. Mose', 'Deut': '5. Mose', 'Josh': 'Josua', 'Ruth': 'Rut',
           '1Sam': '1. Samuel', 'Neh': 'Nehemia', 'Job': 'Hiob', 'Ps': 'Psalm', 'Prov': 'Sprüche', 'Eccl': 'Prediger',
           'Song': 'Hoheslied', 'Isa': 'Jesaja', 'Jer': 'Jeremia', 'Lam': 'Klagelieder', 'Ezek': 'Hesekiel',
           'Dan': 'Daniel', 'Mic': 'Micha', 'Nah': 'Nahum', 'Hab': 'Habakuk', 'Zeph': 'Zephanja', 'Mal': 'Maleachi',
           'Matt': 'Matthäus', 'Mark': 'Markus', 'Luke': 'Lukas', 'John': 'Johannes', 'Acts': 'Apostelgeschichte',
           'Rom': 'Römer', '1Cor': '1. Korinther', '2Cor': '2. Korinther', 'Gal': 'Galater', 'Eph': 'Epheser',
           'Phil': 'Philipper', 'Col': 'Kolosser', '1Thess': '1. Thessalonicher', '2Thess': '2. Thessalonicher',
           '2Tim': '2. Timotheus', 'Titus': 'Titus', 'Heb': 'Hebräer', 'Jas': 'Jakobus', '1Pet': '1. Petrus',
           '2Pet': '2. Petrus', '1John': '1. Johannes', '3John': '3. Johannes', 'Jude': 'Judas', 'Rev': 'Offenbarung'},
    'fr': {'Gen': 'Genèse', 'Exod': 'Exode', 'Num': 'Nombres', 'Deut': 'Deutéronome', 'Josh': 'Josué', 'Ruth': 'Ruth',
           '1Sam': '1 Samuel', 'Neh': 'Néhémie', 'Job': 'Job', 'Ps': 'Psaume', 'Prov': 'Proverbes', 'Eccl': 'Ecclésiaste',
           'Song': 'Cantique des cantiques', 'Isa': 'Ésaïe', 'Jer': 'Jérémie', 'Lam': 'Lamentations', 'Ezek': 'Ézéchiel',
           'Dan': 'Daniel', 'Mic': 'Michée', 'Nah': 'Nahum', 'Hab': 'Habacuc', 'Zeph': 'Sophonie', 'Mal': 'Malachie',
           'Matt': 'Matthieu', 'Mark': 'Marc', 'Luke': 'Luc', 'John': 'Jean', 'Acts': 'Actes', 'Rom': 'Romains',
           '1Cor': '1 Corinthiens', '2Cor': '2 Corinthiens', 'Gal': 'Galates', 'Eph': 'Éphésiens', 'Phil': 'Philippiens',
           'Col': 'Colossiens', '1Thess': '1 Thessaloniciens', '2Thess': '2 Thessaloniciens', '2Tim': '2 Timothée',
           'Titus': 'Tite', 'Heb': 'Hébreux', 'Jas': 'Jacques', '1Pet': '1 Pierre', '2Pet': '2 Pierre', '1John': '1 Jean',
           '3John': '3 Jean', 'Jude': 'Jude', 'Rev': 'Apocalypse'},
    'sw': {'Gen': 'Mwanzo', 'Exod': 'Kutoka', 'Num': 'Hesabu', 'Deut': 'Kumbukumbu la Torati', 'Josh': 'Yoshua',
           'Ruth': 'Ruthu', '1Sam': '1 Samweli', 'Neh': 'Nehemia', 'Job': 'Ayubu', 'Ps': 'Zaburi', 'Prov': 'Mithali',
           'Eccl': 'Mhubiri', 'Song': 'Wimbo Ulio Bora', 'Isa': 'Isaya', 'Jer': 'Yeremia', 'Lam': 'Maombolezo',
           'Ezek': 'Ezekieli', 'Dan': 'Danieli', 'Mic': 'Mika', 'Nah': 'Nahumu', 'Hab': 'Habakuki', 'Zeph': 'Sefania',
           'Mal': 'Malaki', 'Matt': 'Mathayo', 'Mark': 'Marko', 'Luke': 'Luka', 'John': 'Yohana', 'Acts': 'Matendo',
           'Rom': 'Warumi', '1Cor': '1 Wakorintho', '2Cor': '2 Wakorintho', 'Gal': 'Wagalatia', 'Eph': 'Waefeso',
           'Phil': 'Wafilipi', 'Col': 'Wakolosai', '1Thess': '1 Wathesalonike', '2Thess': '2 Wathesalonike',
           '2Tim': '2 Timotheo', 'Titus': 'Tito', 'Heb': 'Waebrania', 'Jas': 'Yakobo', '1Pet': '1 Petro', '2Pet': '2 Petro',
           '1John': '1 Yohana', '3John': '3 Yohana', 'Jude': 'Yuda', 'Rev': 'Ufunuo'},
    'uk': {'Gen': 'Буття', 'Exod': 'Вихід', 'Num': 'Числа', 'Deut': 'Повторення Закону', 'Josh': 'Ісус Навин',
           'Ruth': 'Рут', '1Sam': '1 Самуїлова', 'Neh': 'Неемія', 'Job': 'Йов', 'Ps': 'Псалом', 'Prov': 'Приповісті',
           'Eccl': 'Екклезіяст', 'Song': 'Пісня над піснями', 'Isa': 'Ісая', 'Jer': 'Єремія', 'Lam': 'Плач Єремії',
           'Ezek': 'Єзекіїль', 'Dan': 'Даниїл', 'Mic': 'Михей', 'Nah': 'Наум', 'Hab': 'Авакум', 'Zeph': 'Софонія',
           'Mal': 'Малахія', 'Matt': 'Матвій', 'Mark': 'Марко', 'Luke': 'Лука', 'John': 'Іван', 'Acts': 'Дії',
           'Rom': 'Римлян', '1Cor': '1 Коринтян', '2Cor': '2 Коринтян', 'Gal': 'Галатів', 'Eph': 'Ефесян',
           'Phil': "Филип'ян", 'Col': 'Колосян', '1Thess': '1 Солунян', '2Thess': '2 Солунян', '2Tim': '2 Тимофія',
           'Titus': 'Тит', 'Heb': 'Євреїв', 'Jas': 'Якова', '1Pet': '1 Петра', '2Pet': '2 Петра', '1John': '1 Івана',
           '3John': '3 Івана', 'Jude': 'Юда', 'Rev': "Об'явлення"},
}

# --- offset psalmow (numeracja hebrajska druku vs KJV) z bolls; offset = UBIO - KJV ---
_offc = {}


def _bolls_count(code, ch):
    try:
        u = f"https://bolls.life/get-text/{code}/19/{ch}/"
        d = json.load(urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0'}), timeout=30))
        return len(d)
    except Exception:
        return None


def psalm_offset(ch):
    if ch in _offc:
        return _offc[ch]
    h, k = _bolls_count('UBIO', ch), _bolls_count('KJV', ch)
    off = (h - k) if (h and k) else 0
    _offc[ch] = max(0, off)
    return _offc[ch]


def _shift(vspec, off):
    if not off:
        return vspec
    if '-' in vspec:
        a, b = vspec.split('-', 1)
        return f"{int(a) + off}-{int(b) + off}"
    return str(int(vspec) + off)


MISSING = set()


def _book(lang, b):
    n = BOOKS[lang].get(b)
    if not n:
        MISSING.add(b)
    return n or b


def ref_one(osis, lang):
    b, ch, v = osis.split('.')
    if b == 'Ps' and lang in HEBREW:
        v = _shift(v, psalm_offset(int(ch)))
    sep = SEP.get(lang, ':')
    return f"{_book(lang, b)} {ch}{sep}{v}"


def ref_card(osis_list, lang):
    sep = SEP.get(lang, ':')
    vsep = '.' if lang == 'de' else ','  # de: wersety oddziela kropka (1,1.27.31); reszta przecinkiem
    groups = []  # [book, ch, [vparts]]
    for o in osis_list:
        b, ch, v = o.split('.')
        if b == 'Ps' and lang in HEBREW:
            v = _shift(v, psalm_offset(int(ch)))
        if groups and groups[-1][0] == b and groups[-1][1] == ch:
            groups[-1][2].append(v)
        else:
            groups.append([b, ch, [v]])
    out, prev = [], None
    for b, ch, vs in groups:
        seg = f"{ch}{sep}{vsep.join(vs)}"
        out.append(seg if b == prev else f"{_book(lang, b)} {seg}")
        prev = b
    return '; '.join(out)


def main():
    plfc = json.load(open(os.path.join(CONTENT, 'pl', 'flashcards.json'), encoding='utf-8'))
    ploc = json.load(open(os.path.join(CONTENT, 'pl', 'occasions.json'), encoding='utf-8'))
    for lang in LANGS:
        fc = {'lang': lang, 'translation': BIBLE[lang], 'title': FC_TITLE[lang]}
        if lang in QUIZLET:
            fc['quizletUrl'] = QUIZLET[lang]
        fc['themes'] = []
        for th in plfc['themes']:
            t = {'id': th['id'], 'name': THEMES[lang][th['id']]}
            if th.get('bonus'):
                t['bonus'] = True
            t['cards'] = [{'id': c['id'], 'ref': ref_card(c['osis'], lang), 'osis': c['osis']} for c in th['cards']]
            fc['themes'].append(t)
        json.dump(fc, open(os.path.join(CONTENT, lang, 'flashcards.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=2)

        oc = {'lang': lang, 'translation': BIBLE[lang], 'title': OC_TITLE[lang], 'categories': []}
        for cat in ploc['categories']:
            oc['categories'].append({
                'id': cat['id'], 'name': CATS[lang][cat['id']], 'icon': cat.get('icon', ''),
                'verses': [{'osis': v['osis'], 'ref': ref_one(v['osis'], lang)} for v in cat['verses']],
            })
        json.dump(oc, open(os.path.join(CONTENT, lang, 'occasions.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
        print(f"[{lang}] flashcards + occasions OK")
    if MISSING:
        print("UWAGA brak nazw ksiag dla:", sorted(MISSING))


if __name__ == '__main__':
    main()
