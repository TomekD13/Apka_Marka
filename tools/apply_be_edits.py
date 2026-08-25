# -*- coding: utf-8 -*-
"""Dostosowuje komentarze studiow PL do tekstu Biblii Ekumenicznej.

Po zmianie przekladu z UBG na BE czesc cytatow w komentarzach przestala pasowac
do wyswietlanego tekstu (czytelnik widzi cudzyslow i szuka tych slow obok).
Ten skrypt nanosi ustalone poprawki na JSON-y studiow oraz – o ile fragment tam
wystepuje – na zrodlowe .md w `Materialy/`.

UWAGA: JSON-y w public/content/pl/studies sa DALEJ niz .md (zawieraja pozniejsza
redakcje), dlatego nie wolno ich regenerowac przez md2json.py. Skrypt jest
idempotentny – powtorne uruchomienie nic nie zmienia.

Uzycie:
  python tools/apply_be_edits.py            # raport, bez zapisu
  python tools/apply_be_edits.py --zapisz   # nanosi zmiany
"""
import glob, io, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STUDIES = os.path.join(ROOT, 'public', 'content', 'pl', 'studies')
MATERIALY = os.path.join(os.path.dirname(ROOT), 'Materiały')

# (plik studium albo '*', tekst szukany, tekst nowy)
EDITS = [
    # ---------- cytaty powtarzajace sie w wielu studiach ----------
    ('*', '„Do prawa i do świadectwa!"', '„Ku Prawu i ku świadectwu!"'),
    ('*', '„Do Prawa i do świadectwa!"', '„Ku Prawu i ku świadectwu!"'),
    ('*', '„do Prawa i do świadectwa!"', '„Ku Prawu i ku świadectwu!"'),
    ('*', '„do prawa i do świadectwa"', '„ku Prawu i ku świadectwu"'),
    ('*', '„jesteś mój"', '„należysz do Mnie"'),
    ('*', '„Jedni drugich brzemiona noście', '„Jedni drugich ciężary noście'),
    ('*', '„usta mówiące wielkie rzeczy"', '„usta, które mówiły zuchwałe rzeczy"'),

    # ---------- bestie-i-baranek ----------
    ('bestie-i-baranek',
     'Także tutaj tekst tłumaczy się sam: „baran... to królowie Medii i Persji", a „kozioł to król Grecji".',
     'Także tutaj tekst tłumaczy się sam: baran „oznacza królów Medów i Persów", a „kosmaty kozioł" - „króla Grecji".'),
    ('bestie-i-baranek', '„Oczy jak u człowieka"', '„Oczy podobne do ludzkich oczu"'),  # zdanie zaczyna sie cytatem
    ('bestie-i-baranek', 'Boży lud bywa „na pustyni".', 'Boży lud ucieka „na pustkowie".'),
    ('bestie-i-baranek', 'Kościoła chronionego „na pustyni" w czasie ucisku?',
     'Kościoła, który ucieka „na pustkowie", w czasie ucisku?'),
    ('bestie-i-baranek', 'Królestwo zostaje wreszcie „dane ludowi świętych Najwyższego".',
     'Królestwo wreszcie „otrzyma lud świętych Najwyższego".'),
    ('bestie-i-baranek', 'W niebie zwycięzcą okazuje się nie drapieżnik, lecz „Baranek jakby zabity".',
     'W niebie zwycięzcą okazuje się nie drapieżnik - Jan widzi „Baranka, jakby zabitego".'),
    ('bestie-i-baranek', 'centralną postacią nieba jest „Baranek jakby zabity" (Ap 5,6)',
     'centralną postacią nieba jest Baranek - Jan widzi Go „jakby zabitego" (Ap 5,6)'),

    # ---------- biblia ----------
    ('biblia', 'Słowo Boże jest „żywe i skuteczne" - nie martwym tekstem z przeszłości',
     '„Żywe jest bowiem Słowo Boga i skuteczne" - nie jest martwym tekstem z przeszłości'),
    ('biblia', '„Przepis za przepisem… trochę tu, trochę tam"',
     '„przepis dla przepisu… trochę tu, trochę tam"'),

    # ---------- bozy-kosciol-czasow-konca ----------
    ('bozy-kosciol-czasow-konca', '(„bójcie się Boga", Ap 14,7)', '(„Ulęknijcie się Boga", Ap 14,7)'),
    ('bozy-kosciol-czasow-konca', '„Ku Prawu i ku świadectwu!" - jeśli ktoś mówi inaczej, brak mu światła.',
     '„Ku Prawu i ku świadectwu!" - jeśli ktoś mówi inaczej, nie zabłyśnie dla niego jutrzenka.'),
    ('bozy-kosciol-czasow-konca', '„który stworzył niebo i ziemię, morze i źródła wód"',
     '„który stworzył niebo i ziemię, i morze, i źródła wód"'),

    # ---------- co-po-smierci ----------
    ('co-po-smierci', '„W mgnieniu oka… na ostatnią trąbę"', '„w mgnieniu oka, na dźwięk ostatniej trąby"'),
    ('co-po-smierci', '„Czy lud nie ma się radzić Boga? Czy ma się radzić zmarłych?"',
     '„Czy jednak lud nie powinien radzić się swego Boga? Czy o żyjących pytać się trzeba zmarłych?"'),
    ('co-po-smierci', '(Hbr 9,27 - „raz umrzeć, a potem sąd")', '(Hbr 9,27 - „raz umrą, a potem będzie sąd")'),

    # ---------- czy-ktos-sie-o-mnie-troszczy ----------
    ('czy-ktos-sie-o-mnie-troszczy', 'To klucz interpretacyjny całego psalmu: „znasz mnie" znaczy tu',
     'To klucz interpretacyjny całego psalmu: „Ty mnie przenikasz i znasz" znaczy tu'),
    ('czy-ktos-sie-o-mnie-troszczy', '„Szukajcie najpierw Królestwa" mówi o priorytecie',
     '„Szukajcie więc najpierw Królestwa Boga" mówi o priorytecie'),
    ('czy-ktos-sie-o-mnie-troszczy', 'W Kazaniu na Górze „nie martwcie się" nie znaczy',
     'W Kazaniu na Górze „nie martwcie się" nie znaczy'),
    ('czy-ktos-sie-o-mnie-troszczy', '„nie troszczcie się" to nie wezwanie do bierności',
     '„nie martwcie się" to nie wezwanie do bierności'),
    ('czy-ktos-sie-o-mnie-troszczy', '„w Nim żyjemy, poruszamy się i jesteśmy"',
     '„w Nim żyjemy, poruszamy się i jesteśmy"'),

    # ---------- dary-duchowe ----------
    ('dary-duchowe', '„wielu fałszywych proroków wyszło na świat"',
     '„wielu fałszywych proroków pojawiło się na świecie"'),
    ('dary-duchowe', '„modlitwa wiary uzdrowi chorego"', '„modlitwa płynąca z wiary uzdrowi chorego" (BW)'),

    # ---------- dekalog-a-prawo-mojzeszowe ----------
    ('dekalog-a-prawo-mojzeszowe', 'Prawo jest „święte, sprawiedliwe i dobre".',
     'Prawo jest „święte i sprawiedliwe, i dobre".'),
    ('dekalog-a-prawo-mojzeszowe', 'by „sprawiedliwość prawa wypełniła się w nas"',
     'by „sprawiedliwy czyn Prawa został wypełniony w nas"'),

    # ---------- duch-swiety ----------
    ('duch-swiety', 'Piotr mówi, że Ananiasz „okłamał Ducha Świętego", a zaraz potem: „okłamałeś nie ludzi, lecz Boga".',
     'Piotr mówi Ananiaszowi wprost: „okłamałeś Ducha Świętego", a zaraz potem: „Nie skłamałeś ludziom, lecz Bogu".'),
    ('duch-swiety', 'Jezus obiecuje „innego Pocieszyciela" - kogoś takiego jak On sam, kto „pozostanie z wami na wieki".',
     'Jezus obiecuje „innego Orędownika" - kogoś takiego jak On sam, kto ma „być z wami na wieki".'),
    ('duch-swiety', 'Duch to drugi Orędownik, osobowy Towarzysz, nie nieokreślona moc.',
     'Duch to drugi Orędownik, osobowy Towarzysz, nie nieokreślona moc.'),
    ('duch-swiety', 'Już w pierwszych zdaniach Biblii „Duch Boży unosił się nad wodami"',
     'Już w pierwszych zdaniach Biblii „Duch Boży unosił się nad powierzchnią wód"'),
    ('duch-swiety', '„Dokąd ujdę przed Twoim Duchem?" - Duch jest wszechobecny',
     '„Gdzie się oddalę przed Twoim duchem?" - Duch jest wszechobecny'),
    ('duch-swiety', '„Nie zostawię was sierotami, przyjdę do was."',
     '„Nie pozostawię was sierotami, przyjdę do was."'),
    ('duch-swiety', 'Ojciec „da Ducha Świętego tym, którzy Go proszą"',
     'Ojciec „udzieli Ducha Świętego tym, którzy Go proszą"'),
    ('duch-swiety', '„Jeśli ktoś pragnie, niech przyjdzie do Mnie i pije"',
     '„Jeśli ktoś pragnie, niech przyjdzie do Mnie i niech pije"'),

    # ---------- gdy-upadam ----------
    ('gdy-upadam', 'ale dodaje: „a jeśliby kto zgrzeszył, mamy Orędownika u Ojca - Jezusa".',
     'ale dodaje: „Gdyby jednak ktoś zgrzeszył, mamy Orędownika przed Ojcem - sprawiedliwego Jezusa Chrystusa".'),
    ('gdy-upadam', 'Bóg oddalił twój grzech „tak daleko"?', 'Bóg „tak oddalił od nas nasze winy"?'),
    ('gdy-upadam', '1 J 3,6.9 („kto w Nim trwa, nie grzeszy")', '1 J 3,6.9 („kto w Nim pozostaje, nie grzeszy")'),

    # ---------- godzina-sadu ----------
    ('godzina-sadu', 'Drugi anioł ostrzega: „upadł Babilon"', 'Drugi anioł ostrzega: „Upadł, upadł wielki Babilon"'),
    ('godzina-sadu', 'Jezus „zawsze żyje", aby się za ciebie wstawiać?',
     'Jezus „w każdej chwili żyje po to, aby wstawiać się" za tobą?'),

    # ---------- historia-swiata-w-proroctwie ----------
    ('historia-swiata-w-proroctwie', 'Pogański król wyznaje: „wasz Bóg jest Bogiem bogów i Panem królów".',
     'Pogański król wyznaje: „Wasz Bóg jest naprawdę Bogiem bogów i Panem królów".'),

    # ---------- jak-rozpoznawac-boza-wole ----------
    ('jak-rozpoznawac-boza-wole', 'a potem do Ojca: „nie moja wola, lecz Twoja".',
     'a potem do Ojca: „nie Moja, ale Twoja wola niech się stanie".'),

    # ---------- kim-jest-jezus ----------
    ('kim-jest-jezus', 'Będąc „w postaci Boga", Jezus „ogołocił siebie", przyjmując postać sługi aż po śmierć krzyżową.',
     'Będąc „w postaci Bożej", Jezus „umniejszył samego siebie", przyjmując postać sługi aż po śmierć na krzyżu.'),

    # ---------- lek-stres-pokoj ----------
    ('lek-stres-pokoj', '„nie troszczcie się" / μεριμνάω', '„nie martwcie się" / μεριμνάω'),
    ('lek-stres-pokoj', 'Gdy Jezus mówi „pokój zostawiam wam"', 'Gdy Jezus mówi „Pokój wam zostawiam"'),
    ('lek-stres-pokoj', '„nie lękaj się" jako najczęstszy nakaz Pisma (Iz 41,10)',
     '„Nie bój się" jako najczęstszy nakaz Pisma (Iz 41,10)'),
    ('lek-stres-pokoj', 'obietnica Bożej obecności „dokądkolwiek pójdziesz"?',
     'obietnica Bożej obecności „dokądkolwiek się udasz"?'),
    ('lek-stres-pokoj', 'Gdzie dziś potrzebujesz „być mężnym" mimo lęku?',
     'Gdzie dziś potrzebujesz być „mocny i dzielny" mimo lęku?'),

    # ---------- modlitwa ----------
    ('modlitwa', 'Co by znaczyło „nie ustawać"?', 'Co by znaczyło „nie przestawać"?'),
    ('modlitwa', '„Wiele może usilna modlitwa sprawiedliwego" - modlitwa naprawdę coś zmienia',
     '„Wiele może usilna modlitwa sprawiedliwego" (BW) - modlitwa naprawdę coś zmienia'),

    # ---------- nadzieja-jezus-wroci ----------
    ('nadzieja-jezus-wroci', '„przyjdę znowu i wezmę was do siebie"', '„znowu przyjdę i zabiorę was do siebie"'),
    ('nadzieja-jezus-wroci', 'nazywa je „początkiem boleści"', 'nazywa je „początkiem boleści"'),
    ('nadzieja-jezus-wroci', '„O tym dniu i godzinie nikt nie wie" - ani aniołowie',
     '„Nikt jednak nie wie, kiedy nadejdzie ten dzień i godzina" - ani aniołowie'),
    ('nadzieja-jezus-wroci', '„Pocieszajcie się wzajemnie tymi słowami"', '„Pocieszajcie się więc nawzajem tymi słowami"'),

    # ---------- nawrocenie-i-nowe-zycie ----------
    ('nawrocenie-i-nowe-zycie', '„jeśli się ktoś nie narodzi na nowo, nie może ujrzeć Królestwa Bożego"',
     '„jeśli się ktoś nie narodzi z góry, nie może ujrzeć Królestwa Boga"'),

    # ---------- niebieskie-strefy-zycia ----------
    ('niebieskie-strefy-zycia', 'Ciało jest „świątynią Ducha Świętego" - nie moją prywatną własnością',
     'Ciało jest „świątynią obecnego w was Ducha Świętego" - nie moją prywatną własnością'),
    ('niebieskie-strefy-zycia', 'Kto dąży do celu, „powściąga się we wszystkim" - wstrzemięźliwość.',
     'Kto dąży do celu, „od wszystkiego się wstrzymuje" (BW) - wstrzemięźliwość.'),

    # ---------- prorocze-wyliczenia ----------
    ('prorocze-wyliczenia', 'Co znaczy, że Mesjasz miał umrzeć „nie za siebie" - dla kogo zatem?',
     'Pomazaniec „zostanie stracony i już go nie będzie" - dla kogo zatem umiera Ten, którego samego nic nie obciąża?'),
    ('prorocze-wyliczenia', 'Jezus rozpoczyna służbę słowami „wypełnił się czas"',
     'Jezus rozpoczyna służbę słowami „Wypełnił się czas" (BW)'),
    ('prorocze-wyliczenia', 'prowadzą do roku 1844 i do „oczyszczenia świątyni"',
     'prowadzą do roku 1844 i do chwili, gdy „świątynia odzyska swoje prawa"'),

    # ---------- przymierze-i-charakter-boga ----------
    ('przymierze-i-charakter-boga', 'Jak to, że „miłość nie wyrządza zła bliźniemu", pomaga',
     'Jak to, że „miłość nie wyrządza zła bliźniemu", pomaga'),

    # ---------- relacje-przebaczenie-konflikty ----------
    ('relacje-przebaczenie-konflikty', '„Korzeń goryczy" rośnie w ukryciu i „zatruwa wielu".',
     '„Gorzki korzeń" rośnie w ukryciu i „zatruwa wielu".'),

    # ---------- samotnosc-smutek-depresja ----------
    ('samotnosc-smutek-depresja', '„mąż boleści" - Mesjasz, który zna ból od środka (Iz 53,3)',
     '„pełen boleści, doświadczony cierpieniem" - Mesjasz, który zna ból od środka (Iz 53,3; tradycyjnie: „mąż boleści")'),
    ('samotnosc-smutek-depresja', 'to sen, jedzenie i dotyk anioła: „wstań i jedz".',
     'to sen, jedzenie i dotyk anioła: „Wstań, jedz!".'),

    # ---------- skad-zlo-i-cierpienie ----------
    ('skad-zlo-i-cierpienie', 'Jezus nazywa diabła „ojcem kłamstwa" i „mordercą od początku".',
     'Jezus nazywa diabła „ojcem kłamstwa" i mówi, że „od początku był on mordercą".'),
    ('skad-zlo-i-cierpienie', 'Obietnica jest mocna: „ucisk nie powstanie po raz drugi".',
     'Obietnica jest mocna: „Po raz drugi niedola nie nastanie!".'),

    # ---------- swiatynia-i-przymierze ----------
    ('swiatynia-i-przymierze', 'Jezus „zasiadł po prawicy" i pełni służbę',
     'Jezus „zasiadł po prawej stronie tronu Majestatu w niebiosach" i pełni służbę'),

    # ---------- szafarstwo-i-misja ----------
    ('szafarstwo-i-misja', 'wiernym mówi: „dobrze, sługo dobry".', 'wiernym mówi: „Znakomicie, sługo dobry i wierny".'),
    ('szafarstwo-i-misja', 'niech to czyni „z mocy, której Bóg udziela"', 'niech to czyni „mocą, której udziela Bóg"'),
    ('szafarstwo-i-misja', 'Świadkami mamy być „w Jerozolimie" (tu, blisko)', 'Świadkami mamy być „w Jeruzalem" (tu, blisko)'),
    ('szafarstwo-i-misja', 'biegnie do miasta: „Chodźcie, zobaczcie".', 'biegnie do miasta: „Idźcie, zobaczcie".'),

    # ---------- tozsamosc-i-wartosc ----------
    ('tozsamosc-i-wartosc', 'Dziećmi Bożymi jesteśmy „przez wiarę w Chrystusa"',
     'Dziećmi Bożymi jesteśmy „dzięki wierze w Chrystusa Jezusa"'),

    # ---------- wolnosc ----------
    ('wolnosc', '„Poznacie prawdę, a prawda was wyzwoli."', '„Poznacie prawdę i prawda was wyzwoli."'),
    ('wolnosc', 'walka z nałogiem „pod Prawem" (sam, na zasługę) od walki „pod łaską"',
     'walka z nałogiem „pod Prawem" (sam, na zasługę) od walki „pod łaską"'),

    # ---------- zbawienie-za-darmo ----------
    ('zbawienie-za-darmo', 'są „usprawiedliwieni darmo, z Jego łaski"', 'są „usprawiedliwieni darmo, Jego łaską"'),
    ('zbawienie-za-darmo', '„Ten, który rozpoczął w was dobre dzieło, dokończy go."',
     '„Ten, kto rozpoczął w was dobre dzieło, doprowadzi je do końca."'),
    ('zbawienie-za-darmo', 'Nawet wołając „nędzny ja człowiek!"', 'Nawet wołając „Jak udręczonym jestem człowiekiem!"'),

    # ---------- zycie-w-bozej-rodzinie ----------
    ('zycie-w-bozej-rodzinie', 'stał się „ludem Bożym".', 'stał się „ludem Boga".'),

    # ---------- druga tura: cytaty, ktore po pierwszym przebiegu nadal nie pasowaly ----------
    ('czy-ktos-sie-o-mnie-troszczy', 'Bóg Stwórca nie jest daleki - „w Nim żyjemy, poruszamy się i jesteśmy"',
     'Bóg Stwórca nie jest daleki - „W Nim przecież żyjemy, poruszamy się i jesteśmy"'),
    ('nadzieja-jezus-wroci', 'nazywa je „początkiem boleści"', 'mówi, że to „dopiero początek boleści"'),
    ('przyjscie-i-millenium', 'Skoro Jezus wróci „tak samo", jakie wyobrażenia o Jego przyjściu trzeba odrzucić?',
     'Skoro Jezus „tak przyjdzie, jak widzieliście Go wstępującego do nieba", jakie wyobrażenia o Jego przyjściu trzeba odrzucić?'),
    ('przymierze-i-charakter-boga', 'Jak to, że „miłość nie wyrządza zła bliźniemu", pomaga zrozumieć sens przykazań?',
     'Jak to, że „Miłość bliźniemu nie wyrządza zła", pomaga zrozumieć sens przykazań?'),
    ('wolnosc', 'Czym różni się walka z nałogiem „pod Prawem" (sam, na zasługę) od walki „pod łaską" (z Bogiem, z przyjęcia)?',
     'Czym różni się walka z nałogiem „pod panowaniem Prawa" (sam, na zasługę) od walki pod panowaniem „łaski" (z Bogiem, z przyjęcia)?'),
    ('szafarstwo-i-misja', 'W zdaniu „radosnego dawcę Bóg miłuje" (2 Kor 9,7)',
     'W zdaniu „radosnego dawcę bowiem miłuje Bóg" (2 Kor 9,7)'),
    # ---------- trzecia tura: miejsca, gdzie BE idzie za innym tekstem niz UBG ----------
    ('duch-swiety', 'Błogosławieństwo łączy „łaskę Jezusa, miłość Boga i wspólnotę Ducha Świętego".',
     'Błogosławieństwo łączy „łaskę Pana Jezusa Chrystusa, miłość Boga i wspólnotę Ducha Świętego".'),
    ('gdy-upadam', '„Nie ma żadnego potępienia dla tych, którzy są w Chrystusie Jezusie".',
     '„Żadne więc teraz potępienie nie zagraża tym, którzy są w Jezusie Chrystusie".'),
    ('godzina-sadu', '„Nie ma już potępienia dla tych, którzy są w Chrystusie Jezusie".',
     '„Żadne więc teraz potępienie nie zagraża tym, którzy są w Jezusie Chrystusie".'),
    ('prorocze-wyliczenia',
     '„aż do dwóch tysięcy trzystu wieczorów i poranków, a wtedy świątynia zostanie oczyszczona"',
     '„Dwa tysiące trzysta wieczorów i poranków, a potem świątynia odzyska swoje prawa"'),
    ('prorocze-wyliczenia', '„Po sześćdziesięciu dwóch tygodniach Pomazaniec zostanie zgładzony".',
     '„Po sześćdziesięciu dwóch tygodniach Pomazaniec zostanie stracony".'),
    ('zbawienie-za-darmo', '„jeśli z łaski, to już nie z uczynków, bo inaczej łaska nie byłaby łaską"',
     '„Jeśli zaś dzięki łasce, to nie z powodu uczynków, bo wtedy łaska nie byłaby już łaską"'),

    ('prorocze-wyliczenia',
     'Hebrajski czasownik w Dn 8,14 bywa oddawany jako „zostanie oczyszczona" lub „przywrócona do właściwego stanu / usprawiedliwiona".',
     'Hebrajski czasownik w Dn 8,14 bywa oddawany jako „zostanie oczyszczona" (UBG), „wróci do swojego prawa" (BW) '
     'lub - jak w Biblii Ekumenicznej - „odzyska swoje prawa".'),

    # ================================================================================
    # Poprawki zgloszone w korekcie 2026-08-21, ktorych apply_korekta.py nie nanioslo
    # automatycznie (bramka literalnosci cytatu / niejednoznaczny fragment). Kazda
    # przejrzana recznie wobec tekstu BE – sekcja raportu „Zgloszone, ale nie naniesione".
    # ================================================================================

    # --- bestie-i-baranek ---
    ('bestie-i-baranek', '„zbliższe ujęcie"', '„bliższe ujęcie"'),   # literowka, nie cytat
    ('bestie-i-baranek', 'Czwarta bestia jest „straszna i potężna", inna od poprzednich',
     'Czwarta bestia jest „okropna i przerażająca, o nadzwyczajnej sile", inna od poprzednich'),
    ('bestie-i-baranek', 'poprzednich bestii. „oczy podobne do ludzkich oczu"',
     'poprzednich bestii. „Oczy podobne do ludzkich oczu"'),
    ('bestie-i-baranek', '„człowiek bezprawia" zasiadający „w świątyni Bożej"',
     '„człowiek nieprawości" zasiadający „w świątyni Boga"'),
    ('bestie-i-baranek',
     'Bestia z Apokalipsy 13 „mówi rzeczy wyniosłe i bluźniercze" i działa „czterdzieści dwa miesiące"',
     'Bestii z Apokalipsy 13 dano usta, które „mówiły rzeczy wielkie i bluźnierstwa", '
     'i moc, by działała „czterdzieści dwa miesiące"'),
    ('bestie-i-baranek', 'Paweł niezależnie zapowiada „człowieka bezprawia"',
     'Paweł niezależnie zapowiada „człowieka nieprawości"'),

    # --- bozy-kosciol-czasow-konca ---
    # „reszta" zostaje jako termin ADS (noty n1/n2 omawiaja go osobno), ale cytat idzie za BE
    ('bozy-kosciol-czasow-konca', 'smok rusza na „resztę" jej potomstwa - na tych, którzy',
     'smok rusza na „pozostałych z jej potomstwa" - na resztę, czyli tych, którzy'),
    ('bozy-kosciol-czasow-konca', '„święci, którzy zachowują przykazania Boże i wiarę Jezusa"',
     '„święci, którzy zachowują przykazania Boga i wiarę Jezusa"'),
    ('bozy-kosciol-czasow-konca', '„zachowują przykazania Boże" i „mają świadectwo Jezusa"',
     '„przestrzegają przykazań Boga" i „mają świadectwo Jezusa"'),
    ('bozy-kosciol-czasow-konca', '„lud wybrany (...), by ogłaszać cnoty Tego, który was wezwał"',
     '„Wy jednak jesteście potomstwem wybranym (...), abyście opowiadali o cnotach Tego, który was wezwał"'),

    # --- czym-jest-grzech ---
    ('czym-jest-grzech', 'tylko „kreśli winę"', 'tylko „skreśla winę"'),   # literowka, nie cytat

    # --- dary-duchowe ---
    ('dary-duchowe', '„Nie mogę cię się obejść" - żaden członek nie jest zbędny',
     'Oko nie może powiedzieć ręce: „Nie jesteś mi potrzebna" - żaden członek nie jest zbędny'),

    # --- duch-swiety (komentarz tej samej jednostki juz mowi „innego Orędownika") ---
    ('duch-swiety', 'Skoro Duch jest „innym Pocieszycielem" na wzór Jezusa',
     'Skoro Duch jest „innym Orędownikiem" na wzór Jezusa'),

    # --- gdy-upadam ---
    ('gdy-upadam', 'i „zdąża do celu"', 'i „dąży do celu"'),

    # --- modlitwa ---
    ('modlitwa', '„proście, szukajcie, kołaczcie" (Mt 7,7)', '„proście, szukajcie, pukajcie" (Mt 7,7)'),
    ('modlitwa', 'poprosić Jezusa „naucz mnie się modlić"', 'poprosić Jezusa: „naucz mnie modlić się"'),

    # --- nadzieja-jezus-wroci ---
    ('nadzieja-jezus-wroci', 'Jak wygląd „mocy i chwały" tego przyjścia różni się',
     'Czym przyjście „z mocą i wielką chwałą" różni się'),

    # --- relacje-przebaczenie-konflikty ---
    ('relacje-przebaczenie-konflikty',
     '„Prędki do słuchania, nieskory do gniewu" - bo „gniew człowieka nie wypełnia sprawiedliwości Bożej".',
     '„Chętny do słuchania (...), nieskory do gniewu" - bo „pod wpływem gniewu (...) '
     'człowiek nie wykonuje sprawiedliwości Bożej".'),

    # --- samotnosc-smutek-depresja ---
    ('samotnosc-smutek-depresja', '„złamani na duchu" /', '„złamani sercem" /'),   # hebr. niszbere-lew
    ('samotnosc-smutek-depresja', 'lecz w „cichym, łagodnym głosie"', 'lecz w „szumie cichym i łagodnym"'),

    # --- skad-zlo-i-cierpienie ---
    ('skad-zlo-i-cierpienie',
     'Za „królem Tyru" widać istotę stworzoną „doskonałą", w której „znalazła się nieprawość".',
     'Za „królem Tyru" widać istotę stworzoną jako „pieczęć doskonałości", „bez skazy w swym '
     'postępowaniu", w której dopiero potem „znalazła się (...) nieprawość".'),
    ('skad-zlo-i-cierpienie',
     '„byłeś doskonały w swoich drogach od dnia stworzenia, aż znalazła się w tobie nieprawość"',
     '„Ty byłeś bez skazy w swym postępowaniu od dnia twojego stworzenia, aż znalazła się w tobie nieprawość"'),

    # --- swiatynia-i-przymierze ---
    ('swiatynia-i-przymierze', 'Ziemska świątynia była „odbiciem i cieniem" rzeczywistości niebiańskiej.',
     'Ziemska świątynia była „obrazem i cieniem" rzeczywistości niebiańskich.'),
    ('swiatynia-i-przymierze', 'Jeśli Bóg „uczynił świątynię, aby mieszkać wśród nich"',
     'Jeśli Bóg polecił: „Zbudują Mi też świątynię, abym zamieszkał wśród nich"'),
    ('swiatynia-i-przymierze',
     'mamy „śmiały dostęp" do najświętszego miejsca i możemy „przystąpić z pełnią wiary".',
     'mamy „otwarte wejście do świątyni" i możemy „podejść (...) ze szczerym sercem, z pełną wiarą".'),

    # --- szafarstwo-i-misja ---
    ('szafarstwo-i-misja', 'i zaprasza: „wypróbujcie Mnie".',
     'i zaprasza: „Wystawcie Mnie w ten sposób na próbę!"'),
    ('szafarstwo-i-misja', 'Boże zaproszenie „wypróbujcie Mnie" w sprawie',
     'Boże zaproszenie „Wystawcie Mnie (...) na próbę" w sprawie'),
    ('szafarstwo-i-misja', 'metoda misji to „przyjdź i zobacz"', 'metoda misji to „Chodź i zobacz"'),

    # --- tozsamosc-i-wartosc ---
    ('tozsamosc-i-wartosc', '„Wybrane plemię, królewskie kapłaństwo, lud na własność Boga" - tożsamość',
     '„Potomstwo wybrane, królewskie kapłaństwo, naród święty, lud wykupiony" - tożsamość'),

    # --- wolnosc ---
    ('wolnosc', 'rozpaczy („skoro kuszę się, znaczy że przegrałem")',
     'rozpaczy („skoro jestem kuszony, to znaczy, że przegrałem")'),

    # --- zycie-w-bozej-rodzinie ---
    ('zycie-w-bozej-rodzinie', 'po „rozsądzeniu samego siebie"', 'po „zbadaniu samego siebie"'),
]


def esc(s):
    """Fragment w postaci, w jakiej stoi w pliku JSON (cudzyslow jako \\")."""
    return json.dumps(s, ensure_ascii=False)[1:-1]


def apply_to_text(text, edits, escape=False):
    """Zwraca (nowy_tekst, liczba_zmian_per_edit)."""
    hits = []
    for old, new in edits:
        if old == new:
            hits.append(0)
            continue
        o, n_ = (esc(old), esc(new)) if escape else (old, new)
        n = text.count(o)
        if n:
            text = text.replace(o, n_)
        hits.append(n)
    return text, hits


def main():
    save = '--zapisz' in sys.argv
    done = {i: 0 for i in range(len(EDITS))}

    for path in sorted(glob.glob(os.path.join(STUDIES, '*.json'))):
        sid = os.path.basename(path)[:-5]
        raw = io.open(path, encoding='utf-8').read()
        edits = [(o, n) for (f, o, n) in EDITS if f in ('*', sid)]
        idxs = [i for i, (f, _o, _n) in enumerate(EDITS) if f in ('*', sid)]
        new, hits = apply_to_text(raw, edits, escape=True)
        for i, h in zip(idxs, hits):
            done[i] += h
        if new != raw:
            json.loads(new)                       # nie zapisuj, jesli zepsulismy JSON
            if save:
                io.open(path, 'w', encoding='utf-8').write(new)
            print('%-42s zmian: %d' % (os.path.basename(path), sum(hits)))

    # to samo w zrodlowych .md (tam, gdzie fragment jeszcze wystepuje)
    md_hits = 0
    for path in sorted(glob.glob(os.path.join(MATERIALY, '*.md'))):
        raw = io.open(path, encoding='utf-8').read()
        new, hits = apply_to_text(raw, [(o, n) for (_f, o, n) in EDITS])
        if new != raw:
            md_hits += sum(hits)
            if save:
                io.open(path, 'w', encoding='utf-8').write(new)
    print('\nMateriały/*.md – naniesionych fragmentow: %d' % md_hits)

    # rozroznij „juz naniesione" od „nie znaleziono" – inaczej drugi przebieg straszy
    wszystko = ' '.join(io.open(p, encoding='utf-8').read()
                        for p in glob.glob(os.path.join(STUDIES, '*.json')))
    braki = [EDITS[i][1] for i, n in done.items()
             if n == 0 and EDITS[i][1] != EDITS[i][2] and esc(EDITS[i][2]) not in wszystko]
    if braki:
        print('\nNIE ZNALEZIONO (%d) – do sprawdzenia recznie:' % len(braki))
        for p in braki:
            print('   %s' % p[:100])
    else:
        print('\nWszystkie poprawki naniesione (albo juz obecne).')
    if not save:
        print('\n[RAPORT] uruchom z --zapisz, zeby nanieac zmiany.')


if __name__ == '__main__':
    main()
