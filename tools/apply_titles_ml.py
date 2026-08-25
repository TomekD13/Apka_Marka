# -*- coding: utf-8 -*-
"""Jednorazowo: ustawia nowe (krotsze) tytuly tematow w 7 jezykach (en/es/pt/de/fr/sw/uk).
Mapowanie po 'order' z index.json danego jezyka. Po uruchomieniu odswiez indeksy:
  python tools/build_index.py en es pt de fr sw uk
"""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT = os.path.join(ROOT, 'public', 'content')
LANGS = ['en', 'es', 'pt', 'de', 'fr', 'sw', 'uk']

# (order, en, es, pt, de, fr, sw, uk)
ROWS = [
(1,"Does God care about me?","¿Le importo a Dios?","Será que Deus se importa comigo?","Kümmert sich Gott um mich?","Dieu se soucie-t-il de moi ?","Je, Mungu ananijali?","Чи Бог про мене дбає?"),
(2,"Who really is Jesus?","¿Quién es realmente Jesús?","Quem é realmente Jesus?","Wer ist Jesus wirklich?","Qui est vraiment Jésus ?","Yesu ni nani hasa?","Ким насправді є Ісус?"),
(3,"Where do evil and suffering come from?","¿De dónde vienen el mal y el sufrimiento?","De onde vêm o mal e o sofrimento?","Woher kommen Böses und Leid?","D'où viennent le mal et la souffrance ?","Uovu na mateso yanatoka wapi?","Звідки зло і страждання?"),
(4,"Why did Jesus have to die?","¿Por qué tuvo que morir Jesús?","Por que Jesus teve de morrer?","Warum musste Jesus sterben?","Pourquoi Jésus devait-il mourir ?","Kwa nini Yesu alikufa?","Чому Ісус мусив померти?"),
(5,"A gift you can't buy","Un regalo que no se compra","Um presente que não se compra","Ein Geschenk, das man nicht kaufen kann","Un cadeau qui ne s'achète pas","Zawadi usiyoweza kununua","Дар, який не купиш"),
(6,"How to start over?","¿Cómo empezar de nuevo?","Como recomeçar?","Wie neu anfangen?","Comment recommencer ?","Jinsi ya kuanza upya?","Як почати все наново?"),
(7,"The Holy Spirit in my life","El Espíritu Santo en mi vida","O Espírito Santo na minha vida","Der Heilige Geist in meinem Leben","Le Saint-Esprit dans ma vie","Roho Mtakatifu katika maisha yangu","Святий Дух у моєму житті"),
(8,"How to talk with God?","¿Cómo hablar con Dios?","Como falar com Deus?","Wie mit Gott reden?","Comment parler avec Dieu ?","Jinsi ya kuzungumza na Mungu?","Як розмовляти з Богом?"),
(9,"The Bible - God's voice to me","La Biblia - la voz de Dios para mí","A Bíblia - a voz de Deus para mim","Die Bibel - Gottes Stimme an mich","La Bible - la voix de Dieu pour moi","Biblia - sauti ya Mungu kwangu","Біблія - Божий голос до мене"),
(10,"Temptation, falling, forgiveness","Tentación, caída, perdón","Tentação, queda, perdão","Versuchung, Fall, Vergebung","Tentation, chute, pardon","Majaribu, kuanguka, msamaha","Спокуса, падіння, прощення"),
(11,"Jesus' greatest promise","La mayor promesa de Jesús","A maior promessa de Jesus","Das größte Versprechen Jesu","La plus grande promesse de Jésus","Ahadi kuu ya Yesu","Найбільша обітниця Ісуса"),
(12,"Hope stronger than death","Una esperanza más fuerte que la muerte","Uma esperança mais forte que a morte","Hoffnung stärker als der Tod","Une espérance plus forte que la mort","Tumaini lenye nguvu kuliko mauti","Надія, сильніша за смерть"),
(13,"Life in God's family","La vida en la familia de Dios","A vida na família de Deus","Leben in Gottes Familie","La vie dans la famille de Dieu","Maisha katika familia ya Mungu","Життя в Божій родині"),
(14,"A decision that changes life","Una decisión que cambia la vida","Uma decisão que muda a vida","Eine Entscheidung, die das Leben verändert","Une décision qui change la vie","Uamuzi unaobadilisha maisha","Рішення, що змінює життя"),
(15,"The God who keeps his word","El Dios que cumple su palabra","O Deus que cumpre a sua palavra","Der Gott, der sein Wort hält","Le Dieu qui tient parole","Mungu anayetimiza neno lake","Бог, який дотримує слова"),
(16,"Why do we need commandments?","¿Para qué sirven los mandamientos?","Para que servem os mandamentos?","Wozu Gebote?","À quoi servent les commandements ?","Kwa nini tunahitaji amri?","Навіщо нам заповіді?"),
(17,"The Sabbath - time with God","El sábado - tiempo con Dios","O sábado - tempo com Deus","Der Sabbat - Zeit mit Gott","Le sabbat - du temps avec Dieu","Sabato - wakati pamoja na Mungu","Субота - час із Богом"),
(18,"Jesus - our High Priest","Jesús - nuestro Sumo Sacerdote","Jesus - nosso Sumo Sacerdote","Jesus - unser Hoherpriester","Jésus - notre souverain sacrificateur","Yesu - Kuhani wetu Mkuu","Ісус - наш Первосвященник"),
(19,"God's principles of health","Los principios de Dios para la salud","Os princípios de Deus para a saúde","Gottes Gesundheitsprinzipien","Les principes de santé de Dieu","Kanuni za Mungu za afya","Божі принципи здоров'я"),
(20,"Spiritual gifts in service","Los dones espirituales en el servicio","Os dons espirituais no serviço","Geistliche Gaben im Dienst","Les dons spirituels au service","Karama za rohoni katika huduma","Духовні дари в служінні"),
(21,"My mission and talents","Mi misión y mis talentos","A minha missão e os meus talentos","Meine Mission und Talente","Ma mission et mes talents","Utume wangu na vipawa vyangu","Моя місія і таланти"),
(22,"World history in prophecy","La historia del mundo en la profecía","A história do mundo na profecia","Die Weltgeschichte in der Prophetie","L'histoire du monde dans la prophétie","Historia ya dunia katika unabii","Історія світу в пророцтві"),
(23,"70 weeks and 2300 days","70 semanas y 2300 días","70 semanas e 2300 dias","70 Wochen und 2300 Tage","70 semaines et 2300 jours","Majuma 70 na siku 2300","70 тижнів і 2300 днів"),
(24,"Apocalyptic beasts and the Lamb","Las bestias apocalípticas y el Cordero","As bestas apocalípticas e o Cordeiro","Apokalyptische Tiere und das Lamm","Les bêtes apocalyptiques et l'Agneau","Wanyama wa unabii na Mwana-Kondoo","Апокаліптичні звірі і Агнець"),
(25,"Why is the judgment good news?","¿Por qué el juicio es buena noticia?","Por que o juízo é boa notícia?","Warum ist das Gericht gute Nachricht?","Pourquoi le jugement est-il une bonne nouvelle ?","Kwa nini hukumu ni habari njema?","Чому суд - це добра новина?"),
(26,"God's church in the last days","La iglesia de Dios en los últimos tiempos","A igreja de Deus nos últimos tempos","Gottes Gemeinde in der Endzeit","L'Église de Dieu des derniers temps","Kanisa la Mungu katika siku za mwisho","Божа Церква в часи кінця"),
(27,"Jesus' coming and the millennium","La venida de Jesús y el milenio","A vinda de Jesus e o milênio","Jesu Wiederkunft und das Millennium","Le retour de Jésus et le millénium","Kuja kwa Yesu na milenia","Прихід Ісуса і тисячоліття"),
(28,"A new heaven and a new earth","Un cielo nuevo y una tierra nueva","Novo céu e nova terra","Neuer Himmel und neue Erde","Un ciel nouveau et une terre nouvelle","Mbingu mpya na nchi mpya","Нове небо і нова земля"),
(29,"Your true worth","Tu verdadero valor","O teu verdadeiro valor","Dein wahrer Wert","Ta vraie valeur","Thamani yako ya kweli","Твоя справжня цінність"),
(30,"Conflicts and reconciliation","Conflictos y reconciliación","Conflitos e reconciliação","Konflikte und Versöhnung","Conflits et réconciliation","Migogoro na maridhiano","Конфлікти і примирення"),
(31,"Peace that surpasses understanding","La paz que sobrepasa todo entendimiento","A paz que excede todo entendimento","Der Friede, der allen Verstand übersteigt","La paix qui surpasse toute intelligence","Amani ipitayo akili zote","Мир, що перевищує розум"),
(32,"Hope in sorrow and loneliness","Esperanza en la tristeza y la soledad","Esperança na tristeza e na solidão","Hoffnung in Trauer und Einsamkeit","L'espérance dans la tristesse et la solitude","Tumaini katika huzuni na upweke","Надія в смутку і самотності"),
(33,"Joy beyond circumstances","Gozo más allá de las circunstancias","Alegria além das circunstâncias","Freude unabhängig von den Umständen","La joie au-delà des circonstances","Furaha isiyotegemea mazingira","Радість попри обставини"),
(34,"Freedom in everyday choices","Libertad en las decisiones diarias","Liberdade nas escolhas diárias","Freiheit in den täglichen Entscheidungen","La liberté dans les choix quotidiens","Uhuru katika maamuzi ya kila siku","Свобода в щоденних виборах"),
(35,"How to know God's will?","¿Cómo conocer la voluntad de Dios?","Como reconhecer a vontade de Deus?","Wie erkenne ich Gottes Willen?","Comment discerner la volonté de Dieu ?","Jinsi ya kutambua mapenzi ya Mungu?","Як розпізнати Божу волю?"),
]


def main():
    total = 0
    for li, lang in enumerate(LANGS):
        idx = json.load(open(os.path.join(CONTENT, lang, 'index.json'), encoding='utf-8'))
        order2id = {s['order']: s['id'] for s in idx['studies']}
        chg = 0
        for row in ROWS:
            order, title = row[0], row[li + 1]
            sid = order2id.get(order)
            if not sid:
                continue
            f = os.path.join(CONTENT, lang, 'studies', f'{sid}.json')
            d = json.load(open(f, encoding='utf-8'))
            if d.get('title') != title:
                d['title'] = title
                json.dump(d, open(f, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
                chg += 1
        print(f"[{lang}] zmieniono {chg}/35")
        total += chg
    print("RAZEM:", total)


if __name__ == '__main__':
    main()
