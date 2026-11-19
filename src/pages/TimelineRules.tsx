import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'

// Zasady gry karcianej „Biblijny Timeline” (autor: Marek Micyk). Na tę stronę prowadzi kod QR
// z karty z instrukcją w pudełku gry: jestnadzieja.adwent.pl/biblijnytimeline (I18nProvider
// dokłada /pl/). Strona celowo nie ma linku w menu aplikacji (decyzja autora 2026-11-19);
// na dole zaprasza do reszty aplikacji. Grafiki: public/content/pl/timeline/ (poza precache).

const IMG = `${import.meta.env.BASE_URL}content/pl/timeline/`

function H2({ children }: { children: ReactNode }) {
  return <h2 className="mt-9 mb-3 flex items-center gap-3 text-lg font-bold uppercase tracking-wide text-[#1b6fb8] dark:text-sky-300">
    <span>{children}</span><span aria-hidden className="h-px flex-1 bg-[#1b6fb8]/40 dark:bg-sky-300/30" />
  </h2>
}

function Card({ front, back, caption }: { front: string; back: string; caption: string }) {
  return <figure className="min-w-0">
    <div className="grid grid-cols-2 gap-2">
      <img src={IMG + front} alt={`${caption} – przód karty`} loading="lazy" className="w-full rounded-lg shadow-md" />
      <img src={IMG + back} alt={`${caption} – odwrót karty`} loading="lazy" className="w-full rounded-lg shadow-md" />
    </div>
    <figcaption className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">{caption}: przód i odwrót</figcaption>
  </figure>
}

const VARIANTS: [string, string][] = [
  ['Ostrzej za błąd', 'Kto źle położy kartę, dobiera dwie karty zamiast jednej.'],
  ['Karniak', 'Zamiast dobierania (albo dodatkowo) zadanie wymyślone przez pozostałych graczy, np. werset z pamięci, zwrotka pieśni albo pytanie o historię z karty.'],
  ['Dla młodszych', 'Grajcie tylko łatwiejszymi kartami – z żółtym znaczkiem na odwrocie. Dorosły może też podpowiadać, np. „to było jeszcze przed Mojżeszem”.'],
  ['Wyrównanie szans', 'Starsi lub bardziej doświadczeni gracze dostają na start jedną albo dwie karty więcej.'],
  ['Na czas', '30 sekund na ruch (klepsydra albo telefon). Kto nie zdąży, traci kolejkę.'],
  ['Razem', 'Wszyscy budują jedną wspólną oś i naradzają się nad każdą kartą. Ile kart ułożycie przed trzecim błędem? Spróbujcie pobić swój rekord.'],
  ['Graj sam', 'Odkryj kartę startową, weź 8 kart i sprawdź, ile ułożysz bezbłędnie!'],
  ['Z Biblią w ręku', 'Po każdej karcie ktoś odszukuje w Biblii podany fragment i czyta jeden–dwa wersety.'],
  ['Drużyny', 'Grajcie parami lub zespołami – drużyna wspólnie decyduje, gdzie położyć kartę.'],
]

const FAQ: [string, ReactNode][] = [
  ['Czy można podglądać daty kart, które leżą już na osi?', 'Tak – karty na osi leżą datą do góry i wszyscy je widzą. Zakryte są tylko karty w rękach graczy i w stosie.'],
  ['Co, jeśli dwie karty mają ten sam rok i nie mają liter?', 'Ich kolejność w tym roku nie ma znaczenia – nową kartę możesz położyć przed nią albo za nią.'],
  ['Dlaczego niektóre daty mają skrót „ok.”?', 'Biblia nie zawsze podaje dokładny rok, a dawne kalendarze różnią się od naszego. Wtedy podajemy datę przybliżoną. W grze obowiązuje rok wydrukowany na karcie.'],
  ['Skąd wiadomo, gdzie o tym przeczytać?', <>Na dole odwrotu każdej karty jest odnośnik do Biblii, np. <i>Wj 14,1-31</i> – Księga Wyjścia, rozdział 14, wersety 1–31.</>],
  ['Co, jeśli skończy się stos?', 'Przetasujcie karty odłożone do pudełka i zróbcie z nich nowy stos.'],
]

export function TimelineRules() {
  const { lang = 'pl' } = useParams()
  return <article className="mx-auto max-w-2xl text-slate-800 dark:text-slate-100">
    <header className="relative overflow-hidden rounded-2xl bg-slate-900 shadow-lg">
      <div className="grid h-44 grid-cols-3 sm:h-56" aria-hidden>
        {['naglowek_1', 'naglowek_2', 'naglowek_3'].map((n) =>
          <div key={n} className="bg-cover bg-center" style={{ backgroundImage: `url(${IMG}${n}.webp)`, backgroundPosition: '50% 30%' }} />)}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-end bg-gradient-to-b from-black/0 via-black/20 to-black/85 pb-4 text-center text-white">
        <span className="mb-2 rounded-full border border-white/80 px-3 py-0.5 text-xs uppercase tracking-[0.2em]">Zasady gry</span>
        <span className="text-sm font-bold tracking-[0.5em] text-[#e8c468]">BIBLIJNY</span>
        <h1 className="text-4xl font-extrabold leading-none tracking-tight drop-shadow sm:text-5xl">Timeline</h1>
      </div>
    </header>

    <ul className="mt-4 flex flex-wrap justify-center gap-2 text-sm">
      {['2–8 graczy (albo w pojedynkę)', '120 kart', 'ok. 15–30 minut'].map((s) =>
        <li key={s} className="rounded-full bg-[#1b6fb8]/10 px-3 py-1 text-[#1b6fb8] dark:bg-sky-300/10 dark:text-sky-200">{s}</li>)}
    </ul>

    <div className="study-prose space-y-3">
      <p className="mt-6">
        <b>Biblijny Timeline</b> to rodzinna gra karciana o historii biblijnej. Gracze układają wydarzenia i postacie z Biblii
        we właściwej kolejności na wspólnej osi czasu – od stworzenia świata po zburzenie Jerozolimy w 70 r. n.e. Nie trzeba znać
        dat na pamięć: wystarczy wiedzieć, co było wcześniej, a co później. A przy okazji można się czegoś nauczyć, bo każda karta
        ma krótki opis i miejsce w Biblii.
      </p>

      <H2>Zawartość</H2>
      <ul className="list-disc space-y-1 pl-6">
        <li>120 kart z wydarzeniami i postaciami biblijnymi: 60 łatwiejszych (żółty znaczek na dole odwrotu) i 60 trudniejszych (zielony znaczek),</li>
        <li>karta z instrukcją.</li>
      </ul>

      <H2>Karty</H2>
      <p><b>Przód karty</b>: ilustracja, nazwa wydarzenia lub postaci i pytanie, np. „Kiedy to się wydarzyło?”, „Kiedy się urodził?”, „Kiedy zaczął panować?”.</p>
      <p><b>Odwrót karty</b> to odpowiedź:</p>
      <ul className="list-disc space-y-1 pl-6">
        <li><b>data</b> – duży rok na pasku pod ilustracją,</li>
        <li><b>litera w kółku</b> (A, B, C…) – gdy w tym samym roku jest kilka kart; wyznacza kolejność wydarzeń w tym roku,</li>
        <li><b>krótki opis</b> wydarzenia,</li>
        <li><b>odnośnik biblijny</b> – księga, rozdział i werset, gdzie można o tym przeczytać,</li>
        <li><b>znaczek trudności</b> – żółty: karta łatwiejsza, zielony: trudniejsza.</li>
      </ul>
      <p>Przy władcach obok daty stoi <b>korona</b> – duża data wskazuje wtedy rok objęcia władzy. Pod nią: lata życia (ikonka niemowlęcia) i lata panowania (korona).</p>
      <div className="not-prose grid gap-6 pt-2 sm:grid-cols-2">
        <Card front="karta_20_przod.webp" back="karta_20_tyl.webp" caption="Wydarzenie z literą B" />
        <Card front="karta_29_przod.webp" back="karta_29_tyl.webp" caption="Władca z koroną" />
      </div>

      <H2>Przygotowanie</H2>
      <ol className="list-decimal space-y-2 pl-6">
        <li>Potasujcie karty.</li>
        <li>Rozdajcie karty obrazkiem do góry – strony z datą nie podglądamy:
          <table className="mt-2 w-full max-w-xs border-collapse text-left text-base">
            <thead><tr className="border-b border-slate-300 dark:border-slate-600"><th className="py-1 font-semibold">Liczba graczy</th><th className="py-1 font-semibold">Kart na gracza</th></tr></thead>
            <tbody>
              {[['2–3 graczy', 'po 6 kart'], ['4–5 graczy', 'po 5 kart'], ['6–8 graczy', 'po 4 karty']].map(([a, b]) =>
                <tr key={a} className="border-b border-slate-200 dark:border-slate-700"><td className="py-1">{a}</td><td className="py-1">{b}</td></tr>)}
            </tbody>
          </table>
        </li>
        <li>Z pozostałych kart zróbcie stos (obrazkiem do góry).</li>
        <li>Wierzchnią kartę ze stosu połóżcie na środku stołu <b>datą do góry</b> – to pierwsza karta osi czasu.</li>
      </ol>

      <H2>Przebieg gry</H2>
      <p>Zaczyna najmłodszy gracz, dalej kolejno zgodnie z ruchem wskazówek zegara. Runda to jedna tura każdego gracza.</p>
      <p>W swojej turze:</p>
      <ol className="list-decimal space-y-2 pl-6">
        <li>Wybierz jedną ze swoich kart.</li>
        <li>Połóż ją na osi czasu: <b>na lewo</b> od karty, jeśli wydarzenie było <b>wcześniej</b>, <b>na prawo</b> – jeśli <b>później</b>, albo <b>między dwiema kartami</b>, które już leżą na osi.</li>
        <li>Odwróć kartę i sprawdź datę.</li>
      </ol>
      <ul className="space-y-1 pl-1">
        <li><b className="text-green-600 dark:text-green-400">✔ Dobrze</b> – karta zostaje na osi (datą do góry).</li>
        <li><b className="text-red-600 dark:text-red-400">✘ Źle</b> – odłóż kartę do pudełka i dobierz jedną kartę ze stosu.</li>
      </ul>
      <p>Czytajcie na głos opisy z odwrotu – to okazja, żeby przypomnieć sobie historię albo poznać nową. Oś rośnie z każdą kartą, więc trzeba trafiać coraz dokładniej.</p>

      <H2>Daty</H2>
      <ul className="list-disc space-y-2 pl-6">
        <li><b>p.n.e.</b> (przed naszą erą) – im większa liczba, tym dawniej: rok 1000 p.n.e. był przed rokiem 500 p.n.e. Większość wydarzeń biblijnych to czasy przed naszą erą.</li>
        <li><b>„ok.”</b> – data przybliżona. Wielu dat z czasów starożytnych nie da się podać co do roku; w grze liczy się rok wydrukowany na karcie.</li>
        <li><b>Ten sam rok</b> – jeśli na osi leży już karta z tym samym rokiem, nową możesz położyć po dowolnej jej stronie.</li>
        <li><b>Litery A, B, C…</b> – gdy w jednym roku wydarzyło się kilka rzeczy w znanej kolejności: karta z literą A leży przed kartą z literą B tego samego roku itd. Ułożenie odwrotne to błąd.</li>
        <li><b>Korona</b> przy dacie – wskazuje rok objęcia władzy.</li>
      </ul>

      <H2>Koniec gry</H2>
      <p>Wygrywa gracz, który jako pierwszy prawidłowo położy swoją ostatnią kartę. Gdy komuś skończą się karty, dokończcie rundę, żeby wszyscy zagrali tyle samo razy.</p>
      <ul className="list-disc space-y-2 pl-6">
        <li>Jeśli w tej rundzie kart pozbył się tylko jeden gracz – wygrywa.</li>
        <li>Jeśli kilku – tylko oni grają <b>dogrywkę</b>: każdy dobiera jedną kartę ze stosu i gracie kolejne rundy, aż w którejś tylko jeden z nich zagra prawidłowo. On wygrywa.</li>
      </ul>

      <H2>Zmieniajcie zasady!</H2>
      <p>Biblijny Timeline to gra dla rodziny i przyjaciół – dopasujcie zasady do siebie. Umówcie się tylko przed rozpoczęciem gry. Kilka pomysłów:</p>
      <div className="not-prose grid gap-3 pt-1 sm:grid-cols-2">
        {VARIANTS.map(([t, d]) =>
          <div key={t} className="rounded-xl border border-[#b9cbe0] bg-[#eef3f9] p-3 dark:border-slate-600 dark:bg-slate-800">
            <p className="font-bold text-[#1b6fb8] dark:text-sky-300">{t}</p>
            <p className="mt-1 text-[0.95em] leading-snug">{d}</p>
          </div>)}
      </div>
      <p>Macie własny pomysł na wariant? Podzielcie się nim z nami.</p>

      <H2>Najczęstsze pytania</H2>
      <div className="not-prose space-y-2">
        {FAQ.map(([q, a]) =>
          <details key={q} className="rounded-xl border border-slate-200 bg-white/70 p-3 dark:border-slate-700 dark:bg-slate-800/60">
            <summary className="cursor-pointer font-semibold">{q}</summary>
            <p className="mt-2 leading-snug">{a}</p>
          </details>)}
      </div>
    </div>

    <aside className="mt-10 rounded-2xl bg-gradient-to-br from-[#2c2168] to-[#1f4e79] p-5 text-white shadow-lg">
      <p className="text-lg font-bold">Ta strona jest częścią aplikacji #JestNadzieja</p>
      <p className="mt-1 text-white/85">Znajdziesz w niej pełny tekst Biblii, plany czytania, lekcje biblijne, śpiewnik i modlitwę – także offline, w telefonie.</p>
      <Link to={`/${lang}`} className="mt-3 inline-block rounded-full bg-white px-4 py-2 font-semibold text-[#2c2168] hover:bg-white/90">Poznaj aplikację</Link>
    </aside>
    <p className="mt-6 text-center text-sm text-slate-400">Biblijny Timeline · autor gry: Marek Micyk</p>
  </article>
}
