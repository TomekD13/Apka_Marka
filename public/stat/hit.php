<?php
// Punkt anonimowych statystyk. Przyjmuje tylko wyswietlenia stron i liste zdarzen ponizej.

declare(strict_types=1);
require __DIR__ . '/wspolne.php';

header('Content-Type: text/plain; charset=utf-8');
header('Cache-Control: no-store');

function stat_koniec(string $co = 'ok'): void
{
    echo $co;
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') stat_koniec('pomijam');

$ua = isset($_SERVER['HTTP_USER_AGENT']) ? (string) $_SERVER['HTTP_USER_AGENT'] : '';
if (stat_bot($ua)) stat_koniec('bot');

// Beacon z aplikacji ma pochodzic z tej samej domeny. Nie przyjmujemy ruchu z obcych stron.
$host = strtolower((string) ($_SERVER['HTTP_HOST'] ?? ''));
$origin = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
$referer = (string) ($_SERVER['HTTP_REFERER'] ?? '');
$sourceHost = $origin !== '' ? parse_url($origin, PHP_URL_HOST) : parse_url($referer, PHP_URL_HOST);
if (!is_string($sourceHost) || strtolower($sourceHost) !== preg_replace('~:\d+$~', '', $host)) {
    stat_koniec('obcy');
}

$raw = file_get_contents('php://input');
if ($raw === false || strlen($raw) > 2000) stat_koniec('puste');
$data = json_decode($raw, true);
if (!is_array($data)) stat_koniec('puste');

$type = isset($data['t']) ? (string) $data['t'] : 'page';
$day = gmdate('Y-m-d');

try {
    $db = stat_baza();
    if ($type === 'event') {
        $event = isset($data['e']) ? (string) $data['e'] : '';
        $allowed = array('account_connected', 'app_installed', 'bible_search', 'material_read', 'plan_started', 'share');
        if (!in_array($event, $allowed, true)) stat_koniec('zle zdarzenie');
        $write = $db->prepare('INSERT INTO zdarzenia (dzien, nazwa, ile) VALUES (:d, :n, 1)
            ON CONFLICT (dzien, nazwa) DO UPDATE SET ile = ile + 1');
        $write->bindValue(':d', $day, SQLITE3_TEXT);
        $write->bindValue(':n', $event, SQLITE3_TEXT);
        $write->execute();
    } else {
        $path = isset($data['p']) ? (string) $data['p'] : '';
        $path = strtok($path, '?#');
        $path = preg_replace('~[^\w\-/\.]~u', '', (string) $path);
        $path = substr((string) $path, 0, 120);
        if ($path === '' || $path[0] !== '/') stat_koniec('zla sciezka');

        $source = '';
        $ref = isset($data['r']) ? (string) $data['r'] : '';
        if ($ref !== '') {
            $refHost = parse_url($ref, PHP_URL_HOST);
            if (is_string($refHost) && $refHost !== '' && strtolower($refHost) !== preg_replace('~:\d+$~', '', $host)) {
                $source = substr((string) preg_replace('~[^a-z0-9.\-]~i', '', $refHost), 0, 60);
            }
        }
        $write = $db->prepare('INSERT INTO odslony (dzien, sciezka, zrodlo, urzadzenie, ile)
            VALUES (:d, :p, :z, :u, 1)
            ON CONFLICT (dzien, sciezka, zrodlo, urzadzenie) DO UPDATE SET ile = ile + 1');
        $write->bindValue(':d', $day, SQLITE3_TEXT);
        $write->bindValue(':p', $path, SQLITE3_TEXT);
        $write->bindValue(':z', $source, SQLITE3_TEXT);
        $write->bindValue(':u', stat_urzadzenie($ua), SQLITE3_TEXT);
        $write->execute();

        $visit = $db->prepare('INSERT OR IGNORE INTO wizyty (dzien, odcisk) VALUES (:d, :o)');
        $visit->bindValue(':d', $day, SQLITE3_TEXT);
        $visit->bindValue(':o', stat_odcisk_dnia($db, $day), SQLITE3_TEXT);
        $visit->execute();
    }
    if (random_int(1, 200) === 1) {
        $db->exec('DELETE FROM odslony WHERE dzien < date("now", "-190 day")');
        $db->exec('DELETE FROM wizyty WHERE dzien < date("now", "-190 day")');
        $db->exec('DELETE FROM zdarzenia WHERE dzien < date("now", "-190 day")');
    }
    $db->close();
} catch (Throwable $error) {
    stat_koniec('blad');
}

stat_koniec();
