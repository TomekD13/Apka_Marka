<?php
// Panel zbiorczych statystyk. Nie wyswietla kont, adresow ani historii pojedynczej osoby.

declare(strict_types=1);
require __DIR__ . '/wspolne.php';

session_set_cookie_params(array('httponly' => true, 'samesite' => 'Strict', 'secure' => !empty($_SERVER['HTTPS'])));
session_start();

$config = stat_config();
$hash = isset($config['haslo_hash']) ? (string) $config['haslo_hash'] : '';
if (isset($_GET['wyloguj'])) {
    session_destroy();
    header('Location: ?');
    exit;
}

$error = '';
if ($hash !== '' && !isset($_SESSION['stat_ok']) && isset($_POST['haslo'])) {
    $db = stat_baza();
    $fingerprint = stat_odcisk_dnia($db, gmdate('Y-m-d'));
    $tries = stat_proby($db, $fingerprint, 900);
    if ($tries >= 8) {
        $error = 'Za dużo prób. Spróbuj za kwadrans.';
    } elseif (password_verify((string) $_POST['haslo'], $hash)) {
        stat_wyczysc_proby($db, $fingerprint);
        $db->close();
        $_SESSION['stat_ok'] = true;
        header('Location: ?');
        exit;
    } else {
        stat_zapisz_probe($db, $fingerprint);
        $error = 'Nieprawidłowe hasło.';
        sleep(1);
    }
    $db->close();
}

function stat_liczba(SQLite3 $db, string $sql, string $from, ?string $to = null): int
{
    $query = $db->prepare($sql);
    $query->bindValue(':od', $from, SQLITE3_TEXT);
    if ($to !== null) $query->bindValue(':do', $to, SQLITE3_TEXT);
    $row = $query->execute()->fetchArray(SQLITE3_ASSOC);
    return $row === false ? 0 : (int) $row['ile'];
}

function stat_wiersze(SQLite3 $db, string $sql, string $from): array
{
    $query = $db->prepare($sql);
    $query->bindValue(':od', $from, SQLITE3_TEXT);
    $result = $query->execute();
    $rows = array();
    while ($row = $result->fetchArray(SQLITE3_ASSOC)) $rows[] = $row;
    return $rows;
}

function stat_liczba_html(int $number): string
{
    return number_format($number, 0, ',', ' ');
}

function stat_change(int $current, int $previous): string
{
    if ($previous < 1) return $current > 0 ? 'nowe dane' : '—';
    $change = (int) round((($current - $previous) / $previous) * 100);
    return ($change > 0 ? '+' : '') . $change . '%';
}

$loggedIn = $hash !== '' && isset($_SESSION['stat_ok']);
$days = isset($_GET['dni']) ? (int) $_GET['dni'] : 30;
if (!in_array($days, array(7, 30, 90, 190), true)) $days = 30;

$data = array();
if ($loggedIn) {
    $from = gmdate('Y-m-d', time() - ($days - 1) * 86400);
    $previousFrom = gmdate('Y-m-d', time() - (($days * 2) - 1) * 86400);
    $previousTo = gmdate('Y-m-d', time() - $days * 86400);
    $db = stat_baza();
    $data['views'] = stat_liczba($db, 'SELECT COALESCE(SUM(ile), 0) AS ile FROM odslony WHERE dzien >= :od', $from);
    $data['previousViews'] = stat_liczba($db, 'SELECT COALESCE(SUM(ile), 0) AS ile FROM odslony WHERE dzien >= :od AND dzien <= :do', $previousFrom, $previousTo);
    $data['visits'] = stat_liczba($db, 'SELECT COUNT(*) AS ile FROM wizyty WHERE dzien >= :od', $from);
    $data['installs'] = stat_liczba($db, 'SELECT COALESCE(SUM(ile), 0) AS ile FROM zdarzenia WHERE nazwa = "app_installed" AND dzien >= :od', $from);
    $data['daily'] = stat_wiersze($db, 'SELECT dzien, SUM(ile) AS ile FROM odslony WHERE dzien >= :od GROUP BY dzien ORDER BY dzien', $from);
    $data['dailyVisits'] = stat_wiersze($db, 'SELECT dzien, COUNT(*) AS ile FROM wizyty WHERE dzien >= :od GROUP BY dzien ORDER BY dzien', $from);
    $data['dailyInstalls'] = stat_wiersze($db, 'SELECT dzien, SUM(ile) AS ile FROM zdarzenia WHERE nazwa = "app_installed" AND dzien >= :od GROUP BY dzien ORDER BY dzien', $from);
    $data['comparisonDaily'] = stat_wiersze($db, 'SELECT dzien, SUM(ile) AS ile FROM odslony WHERE dzien >= :od AND dzien <= :do GROUP BY dzien ORDER BY dzien', $previousFrom, $previousTo);
    $firstData = stat_wiersze($db, 'SELECT MIN(dzien) AS dzien FROM (SELECT dzien FROM odslony UNION ALL SELECT dzien FROM wizyty UNION ALL SELECT dzien FROM zdarzenia) WHERE dzien >= :od', '0000-01-01');
    $data['firstDataDate'] = isset($firstData[0]['dzien']) && $firstData[0]['dzien'] !== null ? (string) $firstData[0]['dzien'] : '';
    $data['firstDataLabel'] = $data['firstDataDate'] !== '' ? date('d.m.Y', strtotime($data['firstDataDate'])) : '';
    $data['events'] = stat_wiersze($db, 'SELECT nazwa, SUM(ile) AS ile FROM zdarzenia WHERE dzien >= :od GROUP BY nazwa ORDER BY ile DESC', $from);
    $eventCoverage = stat_wiersze($db, 'SELECT MIN(dzien) AS dzien FROM zdarzenia WHERE dzien >= :od', '0000-01-01');
    $data['eventsSince'] = isset($eventCoverage[0]['dzien']) && $eventCoverage[0]['dzien'] !== null ? (string) $eventCoverage[0]['dzien'] : '';
    $data['eventsTracked'] = $data['eventsSince'] !== '';
    $data['pages'] = stat_wiersze($db, 'SELECT sciezka, SUM(ile) AS ile FROM odslony WHERE dzien >= :od GROUP BY sciezka ORDER BY ile DESC', $from);
    $data['sources'] = stat_wiersze($db, 'SELECT zrodlo, SUM(ile) AS ile FROM odslony WHERE dzien >= :od AND zrodlo <> "" GROUP BY zrodlo ORDER BY ile DESC', $from);
    $data['devices'] = stat_wiersze($db, 'SELECT urzadzenie, SUM(ile) AS ile FROM odslony WHERE dzien >= :od GROUP BY urzadzenie ORDER BY ile DESC', $from);
    $db->close();

    $series = array();
    foreach ($data['daily'] as $row) $series[(string) $row['dzien']] = (int) $row['ile'];
    $visitSeries = array();
    foreach ($data['dailyVisits'] as $row) $visitSeries[(string) $row['dzien']] = (int) $row['ile'];
    $installSeries = array();
    foreach ($data['dailyInstalls'] as $row) $installSeries[(string) $row['dzien']] = (int) $row['ile'];
    $previousSeries = array();
    foreach ($data['comparisonDaily'] as $row) $previousSeries[(string) $row['dzien']] = (int) $row['ile'];
    $data['chart'] = array();
    $data['chartVisits'] = array();
    $data['chartInstalls'] = array();
    $data['chartPrevious'] = array();
    for ($i = $days - 1; $i >= 0; $i--) {
        $day = gmdate('Y-m-d', time() - $i * 86400);
        $data['chart'][] = array('day' => $day, 'views' => $series[$day] ?? 0);
        $data['chartVisits'][] = array('day' => $day, 'views' => $visitSeries[$day] ?? 0);
        $data['chartInstalls'][] = array('day' => $day, 'views' => $installSeries[$day] ?? 0);
        $previousDay = gmdate('Y-m-d', strtotime($day . ' -' . $days . ' days'));
        $data['chartPrevious'][] = array('day' => $day, 'compareDay' => $previousDay, 'views' => $previousSeries[$previousDay] ?? 0);
    }
    $data['eventMap'] = array();
    foreach ($data['events'] as $row) $data['eventMap'][(string) $row['nazwa']] = (int) $row['ile'];
}
?>
<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Statystyki #JestNadzieja</title>
<style>
  :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; color:#10213f; background:#eef3f8; }
  * { box-sizing:border-box; } body { margin:0; min-width:320px; } a { color:inherit; }
  .login { width:min(360px, calc(100% - 32px)); margin:12vh auto; padding:28px; border-radius:20px; background:#fff; box-shadow:0 18px 60px #0b244020; }
  .login h1 { margin:0; font-size:24px; }.login p { color:#52647d; line-height:1.55; }.login input { width:100%; margin-top:7px; padding:11px 12px; border:1px solid #cbd7e6; border-radius:10px; font:inherit; }.login button { width:100%; margin-top:16px; padding:11px 14px; border:0; border-radius:10px; background:#0879e6; color:#fff; font:inherit; font-weight:700; cursor:pointer; }
  .error { color:#b42318 !important; }.shell { min-height:100vh; display:grid; grid-template-columns:224px minmax(0, 1fr); }
  .side { padding:26px 16px; color:#dcecff; background:#092a52; }.brand { margin:0 9px 30px; font-size:20px; font-weight:800; letter-spacing:-.04em; }.brand span { color:#48a5ff; }.brand small { display:block; margin-top:4px; color:#a8c6e5; font-size:12px; font-weight:500; letter-spacing:0; }
  .side a { display:block; margin:6px 0; padding:11px 12px; border-radius:10px; color:#cee1f8; text-decoration:none; font-size:14px; }.side a:first-of-type { background:#0879e6; color:#fff; font-weight:700; }.side .logout { margin-top:30px; color:#a8c6e5; }
  main { width:min(1180px, 100%); margin:0 auto; padding:32px clamp(18px, 3vw, 42px) 34px; }.top { display:flex; align-items:center; justify-content:space-between; gap:16px; }.top h1 { margin:0; font-size:clamp(25px, 3vw, 37px); letter-spacing:-.045em; }.period { display:flex; gap:8px; flex-wrap:wrap; }.period a { padding:9px 12px; border:1px solid #cbd7e6; border-radius:9px; background:#fff; color:#52647d; font-size:13px; text-decoration:none; }.period a.on { border-color:#0879e6; background:#0879e6; color:#fff; font-weight:700; }
  .cards { display:grid; grid-template-columns:repeat(4, minmax(0, 1fr)); gap:14px; margin:28px 0 18px; }.card, .panel { background:#fff; border:1px solid #dfe8f1; border-radius:16px; box-shadow:0 5px 18px #0b24400c; }.card { min-height:128px; padding:18px; }.card-button { display:block; width:100%; color:inherit; text-align:left; font:inherit; cursor:pointer; transition:border-color .15s, box-shadow .15s, transform .15s; }.card-button:hover { transform:translateY(-2px); border-color:#91c5f5; }.card-button[aria-pressed="true"] { border-color:#1685e5; box-shadow:0 0 0 3px #1685e520, 0 5px 18px #0b24400c; }.card .icon { display:inline-flex; width:34px; height:34px; align-items:center; justify-content:center; border-radius:50%; background:#e7f3ff; color:#0879e6; font-size:18px; }.card b { display:block; margin-top:12px; font-size:28px; line-height:1; letter-spacing:-.05em; }.card b.good { color:#09874e; }.card span { display:block; margin-top:7px; color:#60728b; font-size:13px; line-height:1.35; }
  .panel { margin-top:16px; padding:20px; }.panel h2 { margin:0 0 16px; font-size:17px; letter-spacing:-.02em; }.chart-wrap { position:relative; }.chart { width:100%; height:230px; overflow:visible; touch-action:pan-y; }.chart-hint { display:block; margin-top:2px; color:#71839a; font-size:12px; line-height:1.45; }.gridline { stroke:#e6edf4; stroke-width:1; }.line { fill:none; stroke:#1488ed; stroke-width:3; stroke-linecap:round; stroke-linejoin:round; }.line.previous { stroke:#94a3b8; stroke-dasharray:8 7; }.area { fill:#1488ed18; }.axis { fill:#71839a; font-size:11px; }.axis.weekend { fill:#d27016; font-weight:700; }.weekend-band { fill:#fff5e9; }.weekend-tick { stroke:#e4963d; stroke-width:2; }.data-start-line { stroke:#7c3aed; stroke-width:2; stroke-dasharray:5 4; }.data-start-label { fill:#6d28d9; font-size:12px; font-weight:700; }.day-dot { fill:#1488ed; stroke:#fff; stroke-width:2; }.day-dot.weekend { fill:#e88a2d; }.day-dot.previous-dot { fill:#94a3b8; }.chart-crosshair { stroke:#8a9ab0; stroke-width:1.5; stroke-dasharray:4 4; }.chart-interaction { cursor:crosshair; outline:none; }.chart-interaction:focus-visible { stroke:#0879e6; stroke-width:2; }.chart-tooltip { position:absolute; z-index:2; top:10px; max-width:min(280px, 85%); padding:10px 12px; border:1px solid #dbe5f0; border-radius:10px; background:#fff; box-shadow:0 6px 22px #10213f20; color:#10213f; font-size:12px; line-height:1.45; pointer-events:none; transform:translateX(-50%); }.chart-tooltip[hidden] { display:none; }.chart-tooltip strong { display:block; margin-bottom:4px; font-size:13px; }.chart-tooltip span { display:block; color:#52647d; }.chart-tooltip .tooltip-weekend { color:#bd6410; font-weight:700; }.chart-head { display:flex; align-items:center; justify-content:space-between; gap:12px; }.chart-head h2 { margin:0; }.chart-start-info { flex:1; color:#6d28d9; font-size:12px; font-weight:700; }.chart-legend { display:flex; gap:16px; color:#60728b; font-size:12px; }.chart-legend span::before { display:inline-block; width:16px; height:3px; margin:0 6px 3px 0; border-radius:2px; background:#1488ed; content:""; }.chart-legend .previous-key::before { background:#94a3b8; }
  .features { display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:0 32px; }.feature { display:grid; grid-template-columns:30px minmax(0,1fr) auto; align-items:center; gap:10px; padding:12px 0; border-top:1px solid #e7edf4; }.feature:first-child, .feature:nth-child(2) { border-top:0; }.feature .symbol { color:#0879e6; font-size:18px; text-align:center; }.feature strong { display:block; font-size:14px; }.feature small { color:#708197; font-size:12px; }.feature .count { color:#43546a; font-size:14px; font-variant-numeric:tabular-nums; }.tracking-note { margin:0 0 10px; padding:11px 13px; border:1px solid #f1ddb9; border-radius:10px; background:#fffaf1; color:#765324; font-size:13px; line-height:1.5; }
  .details { display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:16px; }.details .panel { margin-top:16px; overflow:hidden; padding:0; }.details h2 { padding:18px 18px 4px; }.row { display:flex; justify-content:space-between; gap:12px; padding:10px 18px; border-top:1px solid #edf1f5; color:#42546d; font-size:13px; }.row span:first-child { overflow-wrap:anywhere; }.row span:last-child { flex:none; color:#11294a; font-variant-numeric:tabular-nums; }.empty { color:#73849a; font-size:14px; }.more { margin:8px 18px 16px; border-top:1px solid #edf1f5; }.more summary { padding:12px 0 2px; color:#0879e6; font-size:13px; font-weight:700; cursor:pointer; }.more[open] summary { margin-bottom:7px; }.feature-toggle { display:block; margin-top:4px; padding:4px 0; border:0; background:none; color:#0879e6; font:inherit; font-size:13px; font-weight:700; cursor:pointer; }.privacy { margin:22px 3px 0; color:#60728b; font-size:13px; line-height:1.55; }.privacy strong { color:#334a68; }
  @media (max-width: 900px) { .shell { grid-template-columns:1fr; }.side { display:flex; align-items:center; justify-content:space-between; padding:13px 18px; }.brand { margin:0; font-size:17px; }.brand small, .side a:not(:first-of-type) { display:none; }.side a:first-of-type { margin:0; padding:7px 9px; }.side .logout { margin:0; font-size:0; }.side .logout::after { content:'Wyloguj'; font-size:12px; }.cards { grid-template-columns:repeat(2, minmax(0, 1fr)); }.details { grid-template-columns:1fr; } }
  @media (max-width: 560px) { main { padding:20px 14px 26px; }.top { align-items:flex-start; flex-direction:column; }.period { width:100%; }.period a { flex:1; text-align:center; padding:8px 5px; }.cards { gap:9px; margin:18px 0 9px; }.card { min-height:112px; padding:14px; border-radius:13px; }.card b { margin-top:9px; font-size:24px; }.card span { margin-top:5px; font-size:11px; }.panel { margin-top:10px; padding:15px; border-radius:13px; }.chart { height:190px; }.chart-head { align-items:flex-start; flex-direction:column; }.features { grid-template-columns:1fr; }.feature:nth-child(2) { border-top:1px solid #e7edf4; }.details .panel { margin-top:10px; }.details h2 { padding:15px 15px 3px; }.row { padding:9px 15px; }.more { margin-left:15px; margin-right:15px; }.privacy { margin:16px 2px 0; } }
</style>
</head>
<body>
<?php if ($hash === ''): ?>
  <section class="login"><h1>Statystyki nie są skonfigurowane</h1><p>Na serwerze brakuje pliku <code>stat/config.php</code> z hasłem do panelu.</p></section>
<?php elseif (!$loggedIn): ?>
  <form class="login" method="post"><h1>Statystyki #JestNadzieja</h1><p>Panel pokazuje wyłącznie dane zbiorcze.</p><?php if ($error !== ''): ?><p class="error"><?= stat_h($error) ?></p><?php endif; ?><label>Hasło<input type="password" name="haslo" autofocus></label><button type="submit">Wejdź do panelu</button></form>
<?php else:
  $chartMax = 1;
  foreach ($data['chart'] as $point) $chartMax = max($chartMax, (int) $point['views']);
  $points = array(); $area = array('0,190'); $lastX = 0;
  foreach ($data['chart'] as $index => $point) { $x = count($data['chart']) > 1 ? ($index / (count($data['chart']) - 1)) * 1000 : 500; $y = 190 - (($point['views'] / $chartMax) * 166); $points[] = round($x, 1) . ',' . round($y, 1); $lastX = $x; }
  $area = implode(' ', array_merge($area, $points, array(round($lastX, 1) . ',190')));
  $labels = array('bible_search' => array('⌕', 'Wyszukiwarka'), 'material_read' => array('✓', 'Materiały przeczytane'), 'plan_started' => array('☷', 'Plany czytania'), 'share' => array('↗', 'Udostępnianie'), 'account_connected' => array('◎', 'Połączone konta'), 'app_installed' => array('↓', 'Instalacje aplikacji'));
?>
<div class="shell"><aside class="side"><div class="brand"><span>#</span> JestNadzieja<small>Panel administratora</small></div><nav><a href="#start">▥ &nbsp; Statystyki</a><a href="#funkcje">☷ &nbsp; Funkcje</a><a href="#szczegoly">≡ &nbsp; Szczegóły ruchu</a></nav><a class="logout" href="?wyloguj=1">Wyloguj</a></aside>
<main id="start"><header class="top"><h1>Statystyki #JestNadzieja</h1><nav class="period"><?php foreach (array(7 => '7 dni', 30 => '30 dni', 90 => '90 dni', 190 => 'pół roku') as $period => $label): ?><a class="<?= $days === $period ? 'on' : '' ?>" href="?dni=<?= $period ?>"><?= $label ?></a><?php endforeach; ?></nav></header>
  <section class="cards" aria-label="Podsumowanie okresu">
    <button class="card card-button" type="button" data-chart="views" aria-pressed="true"><span class="icon">◉</span><b><?= stat_liczba_html($data['views']) ?></b><span>odsłony</span></button>
    <button class="card card-button" type="button" data-chart="visits" aria-pressed="false"><span class="icon">◌</span><b><?= stat_liczba_html($data['visits']) ?></b><span>anonimowe wizyty dzienne</span></button>
    <button class="card card-button" type="button" data-chart="comparison" aria-pressed="false"><span class="icon">↗</span><b class="<?= $data['views'] >= $data['previousViews'] ? 'good' : '' ?>"><?= stat_h(stat_change($data['views'], $data['previousViews'])) ?></b><span>względem poprzednich <?= $days ?> dni</span></button>
    <button class="card card-button" type="button" data-chart="installs" aria-pressed="false"><span class="icon">↓</span><b><?= $data['eventsTracked'] ? stat_liczba_html($data['installs']) : '—' ?></b><span><?= $data['eventsTracked'] ? 'instalacje aplikacji' : 'brak historycznych pomiarów' ?></span></button>
  </section>
  <section class="panel" aria-live="polite"><div class="chart-head"><h2 id="chart-title">Odsłony dzień po dniu</h2><?php if ($data['firstDataDate'] !== ''): ?><span class="chart-start-info">Pierwsze zapisane dane: <?= stat_h($data['firstDataLabel']) ?></span><?php endif; ?><div class="chart-legend" id="chart-legend" hidden><span>Bieżący okres</span><span class="previous-key">Poprzedni okres</span></div></div><div class="chart-wrap"><svg class="chart" id="main-chart" viewBox="0 0 1000 235" preserveAspectRatio="none" role="group" aria-label="Wykres odsłon"><g id="weekend-bands"></g><line class="gridline" x1="0" y1="25" x2="1000" y2="25"/><line class="gridline" x1="0" y1="108" x2="1000" y2="108"/><line class="gridline" x1="0" y1="190" x2="1000" y2="190"/><polygon class="area" id="chart-area" points="<?= $area ?>"/><polyline class="line" id="chart-line" points="<?= implode(' ', $points) ?>"/><polyline class="line previous" id="chart-previous" points=""/><g id="chart-markers"></g><text id="chart-no-data" class="axis" x="500" y="115" text-anchor="middle" visibility="hidden">Brak danych dla tego okresu</text><line class="chart-crosshair" id="chart-crosshair" x1="0" y1="25" x2="0" y2="190" visibility="hidden"/><g id="weekend-ticks"></g><g id="chart-ticks"></g><g id="data-start-marker"></g><rect class="chart-interaction" id="chart-interaction" x="0" y="25" width="1000" height="165" fill="transparent" tabindex="0" role="slider" aria-label="Dzień na wykresie. Użyj strzałek lewo i prawo, aby zmienić dzień." aria-valuemin="1" aria-valuemax="<?= $days ?>" aria-valuenow="1"/></svg><div class="chart-tooltip" id="chart-tooltip" role="status" hidden></div></div><small class="chart-hint">Najedź kursorem lub dotknij wykresu, aby sprawdzić pojedynczy dzień. Soboty i niedziele są oznaczone na pomarańczowo. Fioletowa linia oznacza początek zapisanych danych, jeśli mieści się w wybranym okresie.</small></section>
  <?php $featureTop = array(); foreach ($labels as $event => $details): $featureTop[] = array('nazwa' => $event, 'ile' => $data['eventMap'][$event] ?? 0); endforeach; usort($featureTop, function ($a, $b) { return $b['ile'] <=> $a['ile']; }); ?>
  <section class="panel" id="funkcje"><h2>Najczęściej używane funkcje</h2><?php if (!$data['eventsTracked']): ?><p class="tracking-note">Ta baza zawiera historię odsłon, ale nie ma historycznych zdarzeń funkcji ani instalacji. Nie da się ich odtworzyć wstecz; pomiary pojawią się, gdy aplikacja zacznie wysyłać te zdarzenia.</p><?php endif; ?><div class="features"><?php foreach (array_slice($featureTop, 0, 10) as $row): $event = (string) $row['nazwa']; [$symbol, $label] = $labels[$event]; ?><div class="feature"><span class="symbol"><?= $symbol ?></span><span><strong><?= stat_h($label) ?></strong><small>zbiorcze zdarzenia</small></span><span class="count"><?= $data['eventsTracked'] ? stat_liczba_html((int) $row['ile']) : '—' ?></span></div><?php endforeach; ?></div><details class="more"><summary>Pełne dane o funkcjach (<?= count($featureTop) ?>)</summary><?php foreach ($featureTop as $row): $event = (string) $row['nazwa']; ?><div class="row"><span><?= stat_h($labels[$event][1]) ?></span><span><?= $data['eventsTracked'] ? stat_liczba_html((int) $row['ile']) : '—' ?></span></div><?php endforeach; ?></details></section>
  <section class="details" id="szczegoly">
    <div class="panel"><h2>Najczęściej otwierane strony</h2><?php if (!$data['pages']): ?><p class="empty">Brak danych w tym okresie.</p><?php else: foreach (array_slice($data['pages'], 0, 10) as $row): ?><div class="row"><span><?= stat_h((string) $row['sciezka']) ?></span><span><?= stat_liczba_html((int) $row['ile']) ?></span></div><?php endforeach; if (count($data['pages']) > 10): ?><details class="more"><summary>Pełna lista (<?= count($data['pages']) ?> stron)</summary><?php foreach (array_slice($data['pages'], 10) as $row): ?><div class="row"><span><?= stat_h((string) $row['sciezka']) ?></span><span><?= stat_liczba_html((int) $row['ile']) ?></span></div><?php endforeach; ?></details><?php endif; endif; ?></div>
    <div class="panel"><h2>Skąd przychodzą</h2><?php if (!$data['sources']): ?><p class="empty">Tylko wejścia bezpośrednie.</p><?php else: foreach (array_slice($data['sources'], 0, 10) as $row): ?><div class="row"><span><?= stat_h((string) $row['zrodlo']) ?></span><span><?= stat_liczba_html((int) $row['ile']) ?></span></div><?php endforeach; if (count($data['sources']) > 10): ?><details class="more"><summary>Pełna lista (<?= count($data['sources']) ?> źródeł)</summary><?php foreach (array_slice($data['sources'], 10) as $row): ?><div class="row"><span><?= stat_h((string) $row['zrodlo']) ?></span><span><?= stat_liczba_html((int) $row['ile']) ?></span></div><?php endforeach; ?></details><?php endif; endif; ?></div>
    <div class="panel"><h2>Na czym czytają</h2><?php if (!$data['devices']): ?><p class="empty">Brak danych w tym okresie.</p><?php else: foreach ($data['devices'] as $row): ?><div class="row"><span><?= stat_h((string) $row['urzadzenie']) ?></span><span><?= stat_liczba_html((int) $row['ile']) ?></span></div><?php endforeach; endif; ?></div>
  </section>
  <p class="privacy"><strong>Dane zbiorcze • bez profili użytkowników.</strong> Panel nie zapisuje kont, e-maili, treści notatek ani wyszukiwanych słów. „Anonimowe wizyty dzienne” to suma anonimowych osób z poszczególnych dni, a nie liczba rozpoznawanych osób w całym okresie.</p>
</main></div>
<script>
  const chartData = <?= json_encode(array('views' => $data['chart'], 'visits' => $data['chartVisits'], 'installs' => $data['chartInstalls'], 'previous' => $data['chartPrevious'], 'eventsTracked' => $data['eventsTracked'], 'firstDataDate' => $data['firstDataDate']), JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;
  const chartTitles = { views: 'Odsłony dzień po dniu', visits: 'Anonimowe wizyty dzień po dniu', installs: 'Instalacje dzień po dniu', comparison: 'Porównanie odsłon: bieżący i poprzedni okres' };
  const chartButtons = document.querySelectorAll('[data-chart]');
  const svg = document.getElementById('main-chart');
  const svgNS = 'http://www.w3.org/2000/svg';
  const weekendBands = document.getElementById('weekend-bands');
  const weekendTicks = document.getElementById('weekend-ticks');
  const chartTicks = document.getElementById('chart-ticks');
  const dataStartMarker = document.getElementById('data-start-marker');
  const chartMarkers = document.getElementById('chart-markers');
  const tooltip = document.getElementById('chart-tooltip');
  const interaction = document.getElementById('chart-interaction');
  const crosshair = document.getElementById('chart-crosshair');
  const noDataLabel = document.getElementById('chart-no-data');
  let activeMetric = 'views';
  let activeIndex = -1;
  let tooltipPinned = false;
  const dayNames = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
  const monthNames = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
  const dateInfo = (day) => {
    const date = new Date(`${day}T00:00:00Z`);
    return { date, dayName: dayNames[date.getUTCDay()], isWeekend: date.getUTCDay() === 0 || date.getUTCDay() === 6,
      label: `${date.getUTCDate()} ${monthNames[date.getUTCMonth()]}`, short: `${String(date.getUTCDate()).padStart(2, '0')}.${String(date.getUTCMonth() + 1).padStart(2, '0')}` };
  };
  const svgElement = (name, attrs) => {
    const element = document.createElementNS(svgNS, name);
    Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
    return element;
  };
  const plotX = (index, length) => length > 1 ? index / (length - 1) * 1000 : 500;
  const plotY = (value, max) => 190 - (value / max * 166);
  const clear = (element) => { while (element.firstChild) element.removeChild(element.firstChild); };
  const activeSeries = () => activeMetric === 'visits' ? chartData.visits : activeMetric === 'installs' ? chartData.installs : chartData.views;
  const updateTooltip = (index, clientX) => {
    const series = activeSeries();
    const point = series[index];
    if (!point) return;
    const info = dateInfo(point.day);
    const parts = [];
    const heading = document.createElement('strong');
    heading.textContent = `${info.dayName}, ${info.label}`;
    if (info.isWeekend) heading.className = 'tooltip-weekend';
    tooltip.replaceChildren(heading);
    if (activeMetric === 'comparison') {
      const previous = chartData.previous[index];
      const previousInfo = dateInfo(previous.compareDay);
      parts.push(`Bieżący okres: ${point.views} odsłon`);
      parts.push(`${previousInfo.dayName}, ${previousInfo.label}: ${previous.views} odsłon`);
    } else if (activeMetric === 'installs' && !chartData.eventsTracked) {
      parts.push('Brak historycznych pomiarów instalacji');
    } else {
      const name = activeMetric === 'visits' ? 'anonimowych wizyt' : activeMetric === 'installs' ? 'instalacji' : 'odsłon';
      parts.push(`${point.views} ${name}`);
    }
    parts.forEach((text) => {
      const span = document.createElement('span');
      span.textContent = text;
      tooltip.appendChild(span);
    });
    const chartRect = svg.getBoundingClientRect();
    const parentRect = tooltip.parentElement.getBoundingClientRect();
    const xInChart = plotX(index, series.length) / 1000 * chartRect.width;
    tooltip.hidden = false;
    const desiredLeft = chartRect.left - parentRect.left + xInChart;
    const safeCenter = Math.max(tooltip.offsetWidth / 2 + 8, Math.min(parentRect.width - tooltip.offsetWidth / 2 - 8, desiredLeft));
    tooltip.style.left = `${safeCenter}px`;
    crosshair.setAttribute('x1', String(plotX(index, series.length)));
    crosshair.setAttribute('x2', String(plotX(index, series.length)));
    crosshair.setAttribute('visibility', 'visible');
    interaction.setAttribute('aria-valuenow', String(index + 1));
    interaction.setAttribute('aria-valuetext', `${info.dayName}, ${info.label}: ${parts.join(', ')}`);
    activeIndex = index;
    drawMarkers();
  };
  const hideTooltip = () => {
    if (document.activeElement === interaction) return;
    tooltip.hidden = true;
    crosshair.setAttribute('visibility', 'hidden');
    activeIndex = -1;
    drawMarkers();
  };
  const drawMarkers = () => {
    clear(chartMarkers);
    const current = activeSeries();
    if (activeMetric === 'installs' && !chartData.eventsTracked) return;
    const previous = activeMetric === 'comparison' ? chartData.previous : null;
    const max = Math.max(1, ...current.map((point) => point.views), ...(previous || []).map((point) => point.views));
    current.forEach((point, index) => {
      const weekend = dateInfo(point.day).isWeekend;
      const active = index === activeIndex;
      chartMarkers.appendChild(svgElement('circle', { cx: plotX(index, current.length), cy: plotY(point.views, max), r: active ? 6 : weekend ? 4 : 3,
        class: `day-dot${weekend ? ' weekend' : ''}`, 'aria-hidden': 'true' }));
      if (previous) chartMarkers.appendChild(svgElement('circle', { cx: plotX(index, current.length), cy: plotY(previous[index].views, max), r: active ? 5 : 3,
        class: 'day-dot previous-dot', 'aria-hidden': 'true' }));
    });
  };
  const drawAxis = () => {
    clear(weekendBands); clear(weekendTicks); clear(chartTicks); clear(dataStartMarker);
    const days = chartData.views;
    const spacing = 1000 / Math.max(1, days.length);
    const labelStep = Math.max(1, Math.ceil(days.length / 9));
    days.forEach((point, index) => {
      const info = dateInfo(point.day);
      if (!info.isWeekend) return;
      const x = plotX(index, days.length);
      const width = Math.max(3, spacing);
      weekendBands.appendChild(svgElement('rect', { x: Math.max(0, x - width / 2), y: 25, width: Math.min(width, 1000 - Math.max(0, x - width / 2)), height: 165, class: 'weekend-band' }));
      weekendTicks.appendChild(svgElement('line', { x1: x, y1: 194, x2: x, y2: 201, class: 'weekend-tick' }));
      if (days.length <= 35) {
        const text = svgElement('text', { x, y: 219, 'text-anchor': 'middle', class: 'axis weekend' });
        text.textContent = String(info.date.getUTCDate());
        chartTicks.appendChild(text);
      }
    });
    days.forEach((point, index) => {
      if (index !== 0 && index !== days.length - 1 && index % labelStep !== 0) return;
      if (days.length <= 35 && dateInfo(point.day).isWeekend) return;
      const info = dateInfo(point.day);
      const text = svgElement('text', { x: plotX(index, days.length), y: 219, 'text-anchor': index === 0 ? 'start' : index === days.length - 1 ? 'end' : 'middle', class: `axis${info.isWeekend ? ' weekend' : ''}` });
      text.textContent = index === 0 || index === days.length - 1 ? info.short : String(info.date.getUTCDate());
      chartTicks.appendChild(text);
    });
    const firstDataIndex = days.findIndex((point) => point.day === chartData.firstDataDate);
    if (firstDataIndex >= 0) {
      const x = plotX(firstDataIndex, days.length);
      const labelOnRight = x < 820;
      dataStartMarker.appendChild(svgElement('line', { x1: x, y1: 25, x2: x, y2: 190, class: 'data-start-line', 'aria-hidden': 'true' }));
      const label = svgElement('text', { x: labelOnRight ? x + 7 : x - 7, y: 18, 'text-anchor': labelOnRight ? 'start' : 'end', class: 'data-start-label' });
      label.textContent = 'początek danych';
      dataStartMarker.appendChild(label);
    }
  };
  const makeChartPoints = (series, max, closeArea) => {
    const points = series.map((point, index) => {
      const x = series.length > 1 ? index / (series.length - 1) * 1000 : 500;
      const y = 190 - (point.views / max * 166);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return closeArea ? `0,190 ${points.join(' ')} 1000,190` : points.join(' ');
  };
  const renderChart = (metric) => {
    activeMetric = metric;
    tooltipPinned = false;
    const current = activeSeries();
    const previous = activeMetric === 'comparison' ? chartData.previous : null;
    const values = previous ? current.concat(previous) : current;
    const max = Math.max(1, ...values.map((point) => point.views));
    const line = document.getElementById('chart-line');
    const area = document.getElementById('chart-area');
    const priorLine = document.getElementById('chart-previous');
    const hasMetricData = metric !== 'installs' || chartData.eventsTracked;
    line.setAttribute('points', hasMetricData ? makeChartPoints(current, max, false) : '');
    area.setAttribute('points', hasMetricData ? makeChartPoints(current, max, true) : '');
    priorLine.setAttribute('visibility', previous ? 'visible' : 'hidden');
    if (previous) priorLine.setAttribute('points', makeChartPoints(previous, max, false));
    noDataLabel.setAttribute('visibility', hasMetricData ? 'hidden' : 'visible');
    document.getElementById('chart-title').textContent = chartTitles[metric];
    document.getElementById('chart-legend').hidden = !previous;
    svg.setAttribute('aria-label', chartTitles[metric]);
    activeIndex = -1;
    tooltip.hidden = true;
    crosshair.setAttribute('visibility', 'hidden');
    drawMarkers();
    chartButtons.forEach((item) => item.setAttribute('aria-pressed', String(item.dataset.chart === metric)));
  };
  drawAxis();
  chartButtons.forEach((button) => button.addEventListener('click', () => renderChart(button.dataset.chart)));
  const indexAtPointer = (event) => {
    const rect = svg.getBoundingClientRect();
    const x = Math.max(0, Math.min(1000, (event.clientX - rect.left) / rect.width * 1000));
    return Math.round(x / 1000 * (activeSeries().length - 1));
  };
  interaction.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'mouse') tooltipPinned = false;
    updateTooltip(indexAtPointer(event), event.clientX);
  });
  interaction.addEventListener('pointerdown', (event) => {
    tooltipPinned = event.pointerType === 'touch';
    updateTooltip(indexAtPointer(event), event.clientX);
  });
  interaction.addEventListener('pointerleave', () => { if (!tooltipPinned) hideTooltip(); });
  interaction.addEventListener('focus', () => updateTooltip(Math.max(0, activeIndex), svg.getBoundingClientRect().left));
  interaction.addEventListener('blur', hideTooltip);
  interaction.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    const length = activeSeries().length;
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? length - 1 : Math.max(0, Math.min(length - 1, (activeIndex < 0 ? 0 : activeIndex) + (event.key === 'ArrowRight' ? 1 : -1)));
    updateTooltip(next, svg.getBoundingClientRect().left + plotX(next, length) / 1000 * svg.getBoundingClientRect().width);
  });
  renderChart('views');
</script>
<?php endif; ?>
</body></html>
