<?php
// Punkt zliczajacy odslone. Aplikacja wysyla tu krotki JSON przez sendBeacon
// przy kazdej zmianie adresu (React Router nie odpytuje serwera, wiec bez tego
// statystyki z logow widzialyby tylko pierwsze wejscie).
//
// Zasada: zapisujemy zdarzenie, nie czlowieka. Do bazy trafia dzien, sciezka,
// host strony, z ktorej przyszedl czytelnik, i rodzaj urzadzenia. Nie zapisujemy
// adresu IP, nie stawiamy ciasteczek, nie laczymy odslon w sesje.

declare(strict_types=1);
require __DIR__ . '/wspolne.php';

header('Content-Type: text/plain; charset=utf-8');
header('Cache-Control: no-store');

// Odpowiadamy natychmiast i po cichu - to zapytanie nie ma prawa niczego zepsuc
// czytelnikowi ani czekac na dysk.
function stat_koniec(string $co = 'ok'): void
{
    echo $co;
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    stat_koniec('pomijam');
}

$ua = isset($_SERVER['HTTP_USER_AGENT']) ? (string) $_SERVER['HTTP_USER_AGENT'] : '';
if (stat_bot($ua)) {
    stat_koniec('bot');
}

// Zliczamy tylko ruch z wlasnej strony - odsiewa to obce skrypty strzelajace
// w ten adres, bez zadnego tokenu do pilnowania.
$origin = isset($_SERVER['HTTP_ORIGIN']) ? (string) $_SERVER['HTTP_ORIGIN'] : '';
$host = isset($_SERVER['HTTP_HOST']) ? (string) $_SERVER['HTTP_HOST'] : '';
if ($origin !== '' && parse_url($origin, PHP_URL_HOST) !== $host) {
    stat_koniec('obcy');
}

$surowe = file_get_contents('php://input');
if ($surowe === false || strlen($surowe) > 2000) {
    stat_koniec('puste');
}
$dane = json_decode($surowe, true);
if (!is_array($dane)) {
    stat_koniec('puste');
}

// --- sciezka -------------------------------------------------------------
$sciezka = isset($dane['p']) ? (string) $dane['p'] : '';
$sciezka = strtok($sciezka, '?#');                    // bez parametrow i kotwic
$sciezka = preg_replace('~[^\w\-/\.]~u', '', (string) $sciezka);
$sciezka = substr((string) $sciezka, 0, 120);
if ($sciezka === '' || $sciezka[0] !== '/') {
    stat_koniec('zla sciezka');
}

// --- skad przyszedl ------------------------------------------------------
// Sam host, nigdy pelny adres: interesuje nas „z Facebooka", a nie z ktorego wpisu.
$zrodlo = '';
$ref = isset($dane['r']) ? (string) $dane['r'] : '';
if ($ref !== '') {
    $h = parse_url($ref, PHP_URL_HOST);
    if (is_string($h) && $h !== '' && $h !== $host) {
        $zrodlo = substr(preg_replace('~[^a-z0-9\.\-]~i', '', $h), 0, 60);
    }
}

$dzien = gmdate('Y-m-d');
$urzadzenie = stat_urzadzenie($ua);

try {
    $db = stat_baza();

    $w = $db->prepare(
        'INSERT INTO odslony (dzien, sciezka, zrodlo, urzadzenie, ile) VALUES (:d, :s, :z, :u, 1)
         ON CONFLICT (dzien, sciezka, zrodlo, urzadzenie) DO UPDATE SET ile = ile + 1'
    );
    $w->bindValue(':d', $dzien, SQLITE3_TEXT);
    $w->bindValue(':s', $sciezka, SQLITE3_TEXT);
    $w->bindValue(':z', $zrodlo, SQLITE3_TEXT);
    $w->bindValue(':u', $urzadzenie, SQLITE3_TEXT);
    $w->execute();

    // liczba osob w danym dniu - odcisk jest nieodwracalny i wazny tylko ten dzien
    $odcisk = stat_odcisk_dnia($db, $dzien);
    $v = $db->prepare('INSERT OR IGNORE INTO wizyty (dzien, odcisk) VALUES (:d, :o)');
    $v->bindValue(':d', $dzien, SQLITE3_TEXT);
    $v->bindValue(':o', $odcisk, SQLITE3_TEXT);
    $v->execute();

    // sprzatanie: pol roku wstecz wystarczy, baza ma zostac mala
    if (random_int(1, 200) === 1) {
        $db->exec('DELETE FROM odslony WHERE dzien < date("now", "-190 day")');
        $db->exec('DELETE FROM wizyty WHERE dzien < date("now", "-190 day")');
    }
    $db->close();
} catch (Throwable $e) {
    // Statystyka nie jest warta bledu u czytelnika - polykamy po cichu.
    stat_koniec('blad');
}

stat_koniec('ok');
