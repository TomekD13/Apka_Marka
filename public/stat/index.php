<?php
// Panel statystyk: wykres dni, najczesciej czytane strony, zrodla wejsc, urzadzenia.
// Chroniony haslem z config.php (plik zyje tylko na serwerze, nie ma go w repo).
// Bez zewnetrznych bibliotek - wykres rysujemy sami w SVG.

declare(strict_types=1);
require __DIR__ . '/wspolne.php';

session_start();
$cfg = stat_config();
$hash = isset($cfg['haslo_hash']) ? (string) $cfg['haslo_hash'] : '';

if (isset($_GET['wyloguj'])) {
    session_destroy();
    header('Location: ?');
    exit;
}

// Po ilu nieudanych probach w ciagu kwadransa panel przestaje odpowiadac na haslo.
const STAT_LIMIT_PROB = 8;
const STAT_LIMIT_OKNO = 900;

$blad = '';
if ($hash !== '' && !isset($_SESSION['stat_ok']) && isset($_POST['haslo'])) {
    $db = stat_baza();
    $odcisk = stat_odcisk_dnia($db, gmdate('Y-m-d'));
    $ile = stat_proby($db, $odcisk, STAT_LIMIT_OKNO);

    if ($ile >= STAT_LIMIT_PROB) {
        // Zablokowanego nie sprawdzamy - inaczej limit dalby sie obejsc czekaniem
        // na trafienie w oknie, w ktorym akurat cos wygaslo.
        $blad = 'Za duzo prob. Sprobuj za kwadrans.';
    } elseif (password_verify((string) $_POST['haslo'], $hash)) {
        stat_proby_kasuj($db, $odcisk);
        $db->close();
        $_SESSION['stat_ok'] = true;
        header('Location: ?');
        exit;
    } else {
        stat_proba_nieudana($db, $odcisk);
        $zostalo = max(0, STAT_LIMIT_PROB - ($ile + 1));
        $blad = $zostalo > 0
            ? 'Zle haslo. Prob do blokady: ' . $zostalo . '.'
            : 'Zle haslo. Panel zablokowany na kwadrans.';
        sleep(1); // spowalnia zgadywanie
    }
    $db->close();
}

function h($s)
{
    return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');
}

$zalogowany = $hash !== '' && isset($_SESSION['stat_ok']);
?>
<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Statystyki - #JestNadzieja</title>
<style>
  :root { color-scheme: dark; }
  body { margin:0; padding:24px; background:#0f172a; color:#e2e8f0;
         font:16px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
  .srodek { max-width: 960px; margin: 0 auto; }
  h1 { font-size:22px; margin:0 0 4px; }
  h2 { font-size:16px; margin:28px 0 10px; color:#94a3b8; font-weight:600; }
  a { color:#7dd3fc; }
  .karty { display:grid; gap:12px; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); margin-top:16px; }
  .karta { background:#1e293b; border:1px solid #334155; border-radius:12px; padding:14px 16px; }
  .karta b { display:block; font-size:28px; line-height:1.2; }
  .karta span { color:#94a3b8; font-size:13px; }
  table { width:100%; border-collapse:collapse; background:#1e293b;
          border:1px solid #334155; border-radius:12px; overflow:hidden; }
  th, td { padding:8px 12px; text-align:left; border-bottom:1px solid #334155; font-size:14px; }
  th { color:#94a3b8; font-weight:600; }
  td.l { text-align:right; white-space:nowrap; color:#cbd5e1; }
  tr:last-child td { border-bottom:0; }
  .zakres a { display:inline-block; margin-right:10px; padding:4px 10px; border:1px solid #334155;
              border-radius:999px; text-decoration:none; font-size:14px; }
  .zakres a.on { background:#0ea5e9; border-color:#0ea5e9; color:#04263a; font-weight:600; }
  form.login { max-width:320px; margin:80px auto; background:#1e293b; border:1px solid #334155;
               border-radius:12px; padding:20px; }
  input[type=password] { width:100%; box-sizing:border-box; padding:8px 10px; border-radius:8px;
                         border:1px solid #475569; background:#0f172a; color:#e2e8f0; }
  button { margin-top:10px; padding:8px 14px; border:0; border-radius:8px; background:#0284c7;
           color:#fff; font-weight:600; cursor:pointer; }
  .uwaga { color:#94a3b8; font-size:13px; margin-top:28px; }
  .pusto { color:#94a3b8; }
</style>
</head>
<body><div class="srodek">
<?php if ($hash === ''): ?>
  <h1>Statystyki nie sa jeszcze skonfigurowane</h1>
  <p class="uwaga">Brakuje pliku <code>config.php</code> w tym katalogu. Ma zwracac tablice
  z kluczem <code>haslo_hash</code> (wynik funkcji <code>password_hash</code>).</p>
<?php elseif (!$zalogowany): ?>
  <form class="login" method="post">
    <h1>Statystyki</h1>
    <?php if ($blad !== ''): ?><p style="color:#fda4af"><?php echo h($blad); ?></p><?php endif; ?>
    <label>Haslo<br><input type="password" name="haslo" autofocus></label>
    <button type="submit">Wejdz</button>
  </form>
<?php else:
    $dni = isset($_GET['dni']) ? (int) $_GET['dni'] : 30;
    if (!in_array($dni, array(7, 30, 90, 190), true)) {
        $dni = 30;
    }
    $od = gmdate('Y-m-d', time() - ($dni - 1) * 86400);

    $db = stat_baza();
    $licz = function ($sql) use ($db, $od) {
        $s = $db->prepare($sql);
        $s->bindValue(':od', $od, SQLITE3_TEXT);
        $r = $s->execute();
        $out = array();
        while ($w = $r->fetchArray(SQLITE3_ASSOC)) {
            $out[] = $w;
        }
        return $out;
    };

    $poDniach = $licz('SELECT dzien, SUM(ile) AS ile FROM odslony WHERE dzien >= :od GROUP BY dzien ORDER BY dzien');
    $osobyDni = $licz('SELECT dzien, COUNT(*) AS ile FROM wizyty WHERE dzien >= :od GROUP BY dzien ORDER BY dzien');
    $strony   = $licz('SELECT sciezka, SUM(ile) AS ile FROM odslony WHERE dzien >= :od GROUP BY sciezka ORDER BY ile DESC LIMIT 30');
    $zrodla   = $licz('SELECT zrodlo, SUM(ile) AS ile FROM odslony WHERE dzien >= :od AND zrodlo <> "" GROUP BY zrodlo ORDER BY ile DESC LIMIT 15');
    $urzadz   = $licz('SELECT urzadzenie, SUM(ile) AS ile FROM odslony WHERE dzien >= :od GROUP BY urzadzenie ORDER BY ile DESC');

    $sumaOdslon = 0;
    foreach ($poDniach as $w) {
        $sumaOdslon += (int) $w['ile'];
    }
    $sumaOsob = 0;
    foreach ($osobyDni as $w) {
        $sumaOsob += (int) $w['ile'];
    }
    $bezposrednie = $sumaOdslon;
    foreach ($zrodla as $w) {
        $bezposrednie -= (int) $w['ile'];
    }

    // wykres: jeden slupek na dzien, wysokosc wzgledem najlepszego dnia
    $mapaDni = array();
    foreach ($poDniach as $w) {
        $mapaDni[(string) $w['dzien']] = (int) $w['ile'];
    }
    $mapaOsob = array();
    foreach ($osobyDni as $w) {
        $mapaOsob[(string) $w['dzien']] = (int) $w['ile'];
    }
    $seria = array();
    for ($i = $dni - 1; $i >= 0; $i--) {
        $d = gmdate('Y-m-d', time() - $i * 86400);
        $seria[] = array(
            'd' => $d,
            'o' => isset($mapaDni[$d]) ? $mapaDni[$d] : 0,
            'os' => isset($mapaOsob[$d]) ? $mapaOsob[$d] : 0,
        );
    }
    $max = 1;
    foreach ($seria as $p) {
        $max = max($max, $p['o']);
    }
    $szer = 960;
    $wys = 160;
    $krok = $szer / max(1, count($seria));
    $zakresy = array(7 => '7 dni', 30 => '30 dni', 90 => '90 dni', 190 => 'pol roku');
?>
  <h1>Statystyki - #JestNadzieja</h1>
  <p class="zakres">
    <?php foreach ($zakresy as $k => $n): ?>
      <a class="<?php echo $dni === $k ? 'on' : ''; ?>" href="?dni=<?php echo $k; ?>"><?php echo h($n); ?></a>
    <?php endforeach; ?>
    <a href="?wyloguj=1" style="float:right">Wyloguj</a>
  </p>

  <div class="karty">
    <div class="karta"><b><?php echo number_format($sumaOdslon, 0, ',', ' '); ?></b><span>odslon</span></div>
    <div class="karta"><b><?php echo number_format($sumaOsob, 0, ',', ' '); ?></b><span>osob (suma dni)</span></div>
    <div class="karta"><b><?php echo number_format($sumaOdslon / max(1, $dni), 1, ',', ' '); ?></b><span>odslon dziennie</span></div>
    <div class="karta"><b><?php echo number_format(max(0, $bezposrednie), 0, ',', ' '); ?></b><span>wejsc bez odsylacza</span></div>
  </div>

  <h2>Dzien po dniu</h2>
  <svg viewBox="0 0 <?php echo $szer; ?> <?php echo $wys + 22; ?>" style="width:100%;height:auto;background:#1e293b;border:1px solid #334155;border-radius:12px">
    <?php foreach ($seria as $i => $p): ?>
      <?php
        $hSlupka = (int) round($p['o'] / $max * ($wys - 10));
        $x = $i * $krok;
      ?>
      <rect x="<?php echo round($x + 1, 1); ?>" y="<?php echo $wys - $hSlupka; ?>" width="<?php echo round(max(1, $krok - 2), 1); ?>" height="<?php echo $hSlupka; ?>" fill="#0ea5e9" rx="2"><title><?php echo h($p['d']); ?>: <?php echo (int) $p['o']; ?> odslon, <?php echo (int) $p['os']; ?> osob</title></rect>
    <?php endforeach; ?>
    <text x="2" y="<?php echo $wys + 16; ?>" fill="#94a3b8" font-size="11"><?php echo h($seria[0]['d']); ?></text>
    <text x="<?php echo $szer - 2; ?>" y="<?php echo $wys + 16; ?>" fill="#94a3b8" font-size="11" text-anchor="end"><?php echo h($seria[count($seria) - 1]['d']); ?></text>
  </svg>

  <h2>Najczesciej otwierane strony</h2>
  <?php if (!$strony): ?>
    <p class="pusto">Jeszcze nic tu nie ma.</p>
  <?php else: ?>
  <table>
    <tr><th>Adres</th><th class="l">Odslony</th></tr>
    <?php foreach ($strony as $w): ?>
      <tr><td><?php echo h($w['sciezka']); ?></td><td class="l"><?php echo (int) $w['ile']; ?></td></tr>
    <?php endforeach; ?>
  </table>
  <?php endif; ?>

  <h2>Skad przychodza</h2>
  <?php if (!$zrodla): ?>
    <p class="pusto">Same wejscia bezposrednie - z zakladki, z wpisanego adresu albo z aplikacji dodanej do ekranu telefonu.</p>
  <?php else: ?>
  <table>
    <tr><th>Strona</th><th class="l">Wejscia</th></tr>
    <?php foreach ($zrodla as $w): ?>
      <tr><td><?php echo h($w['zrodlo']); ?></td><td class="l"><?php echo (int) $w['ile']; ?></td></tr>
    <?php endforeach; ?>
  </table>
  <?php endif; ?>

  <h2>Na czym czytaja</h2>
  <table>
    <tr><th>Urzadzenie</th><th class="l">Odslony</th></tr>
    <?php foreach ($urzadz as $w): ?>
      <tr><td><?php echo h($w['urzadzenie']); ?></td><td class="l"><?php echo (int) $w['ile']; ?></td></tr>
    <?php endforeach; ?>
  </table>

  <p class="uwaga">
    Licznik nie stawia ciasteczek i nie zapisuje adresow IP. Liczba osob powstaje ze skrotu,
    ktory zmienia sie codziennie i ktorego nie da sie cofnac do adresu ani powiazac miedzy dniami.
    Dane leza wylacznie na tym serwerze, w pliku dane.sqlite.
  </p>
<?php endif; ?>
</div></body>
</html>
