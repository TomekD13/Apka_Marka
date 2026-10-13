<?php
// Odpowiedzi czytelnikow z aplikacji (np. „Na zakonczenie serii” pod dniem 40).
// Adres odbiorcy jest tylko tutaj, na serwerze - strona go nie pokazuje.
// Ochrona: pole „Jestem czlowiekiem”, ukryta pulapka na boty, minimalny czas
// wypelniania, limit wiadomosci z jednego IP i tylko znane domeny aplikacji.

declare(strict_types=1);

const ODBIORCA = 'marek.micyk@adwent.pl';
const NADAWCA = 'noreply@jestnadzieja.adwent.pl';
const LIMIT_NA_GODZINE = 5;
const DOZWOLONE = array(
    'https://jestnadzieja.adwent.pl',
    'https://tomekd13.github.io',
    'http://localhost:5173',
    'http://localhost:4173',
);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function koniec(int $kod, string $co): void
{
    http_response_code($kod);
    echo json_encode(array('ok' => $kod === 200, 'info' => $co));
    exit;
}

$origin = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
if ($origin !== '' && in_array($origin, DOZWOLONE, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
}
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') koniec(405, 'tylko POST');
if (!in_array($origin, DOZWOLONE, true)) koniec(403, 'obca strona');

// pulapka na boty i potwierdzenie czlowieka
if ((string) ($_POST['hp'] ?? '') !== '') koniec(200, 'ok');
if ((string) ($_POST['human'] ?? '') !== '1') koniec(400, 'brak potwierdzenia');
$czas = (int) ($_POST['ms'] ?? 0);
if ($czas < 3000) koniec(400, 'za szybko');

$jednaLinia = static fn (string $s, int $max): string =>
    mb_substr(trim((string) preg_replace('~[\r\n\t]+~', ' ', $s)), 0, $max);

$tresc = trim((string) ($_POST['message'] ?? ''));
$tresc = str_replace("\r\n", "\n", $tresc);
if ($tresc === '' || mb_strlen($tresc) > 5000) koniec(400, 'pusta albo za dluga wiadomosc');
$imie = $jednaLinia((string) ($_POST['name'] ?? ''), 80);
$email = $jednaLinia((string) ($_POST['email'] ?? ''), 120);
if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) $email = '';
$skad = $jednaLinia((string) ($_POST['source'] ?? ''), 80);

// limit z jednego IP (w pliku zapisujemy tylko skrot adresu)
$plik = __DIR__ . '/limity.json';
$klucz = hash('sha256', (string) ($_SERVER['REMOTE_ADDR'] ?? '') . '|jestnadzieja');
$teraz = time();
$f = fopen($plik, 'c+');
if ($f !== false && flock($f, LOCK_EX)) {
    $dane = json_decode((string) stream_get_contents($f), true);
    if (!is_array($dane)) $dane = array();
    foreach ($dane as $k => $lista) {
        $dane[$k] = array_values(array_filter((array) $lista, static fn ($t) => $t > $teraz - 3600));
        if (!$dane[$k]) unset($dane[$k]);
    }
    if (count($dane[$klucz] ?? array()) >= LIMIT_NA_GODZINE) {
        flock($f, LOCK_UN);
        fclose($f);
        koniec(429, 'limit');
    }
    $dane[$klucz][] = $teraz;
    ftruncate($f, 0);
    rewind($f);
    fwrite($f, (string) json_encode($dane));
    flock($f, LOCK_UN);
    fclose($f);
}

$temat = '=?UTF-8?B?' . base64_encode('Jest Nadzieja – odpowiedź z aplikacji' . ($skad !== '' ? " ($skad)" : '')) . '?=';
$cialo = $tresc . "\n\n-- \n"
    . 'Imię: ' . ($imie !== '' ? $imie : '(nie podano)') . "\n"
    . 'E-mail: ' . ($email !== '' ? $email : '(nie podano)') . "\n"
    . 'Skąd: ' . ($skad !== '' ? $skad : 'aplikacja') . "\n"
    . 'Wysłano: ' . date('Y-m-d H:i') . "\n";
$naglowki = array(
    'From: =?UTF-8?B?' . base64_encode('Aplikacja Jest Nadzieja') . '?= <' . NADAWCA . '>',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
);
if ($email !== '') $naglowki[] = 'Reply-To: ' . $email;

if (!mail(ODBIORCA, $temat, $cialo, implode("\r\n", $naglowki), '-f' . NADAWCA)) koniec(500, 'blad wysylki');
koniec(200, 'ok');
