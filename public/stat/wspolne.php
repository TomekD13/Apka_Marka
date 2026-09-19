<?php
// Wspolna czesc licznika odwiedzin: konfiguracja, baza i drobne pomocniki.
// Licznik jest wlasny, bo regula projektu zabrania analityki sledzacej:
// nie ma ciasteczek, nie ma profilowania, dane nie wychodza poza ten serwer.
// Adres IP sluzy wylacznie do policzenia, ile bylo osob, i NIE jest zapisywany
// (patrz odcisk_dnia() nizej).

declare(strict_types=1);

/** Katalog z danymi: baza i konfiguracja. Poza zasiegiem przegladarki (.htaccess). */
function stat_katalog(): string
{
    return __DIR__;
}

/** Konfiguracja z config.php (haslo do panelu). Plik powstaje na serwerze i NIE jest w repo. */
function stat_config(): array
{
    $p = stat_katalog() . '/config.php';
    if (!is_file($p)) {
        return array();
    }
    $c = include $p;
    return is_array($c) ? $c : array();
}

/** Polaczenie z baza. Tworzy tabele przy pierwszym uruchomieniu. */
function stat_baza(): SQLite3
{
    $db = new SQLite3(stat_katalog() . '/dane.sqlite');
    $db->busyTimeout(4000);
    $db->exec('PRAGMA journal_mode = WAL');
    $db->exec(
        'CREATE TABLE IF NOT EXISTS odslony (
            dzien TEXT NOT NULL,
            sciezka TEXT NOT NULL,
            zrodlo TEXT NOT NULL DEFAULT "",
            urzadzenie TEXT NOT NULL DEFAULT "",
            ile INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (dzien, sciezka, zrodlo, urzadzenie)
        )'
    );
    $db->exec(
        'CREATE TABLE IF NOT EXISTS wizyty (
            dzien TEXT NOT NULL,
            odcisk TEXT NOT NULL,
            PRIMARY KEY (dzien, odcisk)
        )'
    );
    $db->exec('CREATE TABLE IF NOT EXISTS sol (dzien TEXT PRIMARY KEY, wartosc TEXT NOT NULL)');
    return $db;
}

/**
 * Odcisk odwiedzajacego na jeden dzien: skrot z adresu IP, przegladarki i losowej
 * soli, ktora zmienia sie kazdego dnia. Sam adres IP nigdzie nie trafia, a po
 * zmianie soli starego odcisku nie da sie z niczym powiazac - to pozwala policzyc
 * osoby, nie pozwalajac ich rozpoznac.
 */
function stat_odcisk_dnia(SQLite3 $db, string $dzien): string
{
    $s = $db->prepare('SELECT wartosc FROM sol WHERE dzien = :d');
    $s->bindValue(':d', $dzien, SQLITE3_TEXT);
    $sol = $s->execute()->fetchArray(SQLITE3_ASSOC);
    if ($sol === false) {
        $wartosc = bin2hex(random_bytes(16));
        $w = $db->prepare('INSERT OR IGNORE INTO sol (dzien, wartosc) VALUES (:d, :w)');
        $w->bindValue(':d', $dzien, SQLITE3_TEXT);
        $w->bindValue(':w', $wartosc, SQLITE3_TEXT);
        $w->execute();
        // stare sole kasujemy - bez nich odciski sprzed tygodni sa nieodwracalne
        $db->exec('DELETE FROM sol WHERE dzien < date("now", "-2 day")');
    } else {
        $wartosc = (string) $sol['wartosc'];
    }

    $ip = isset($_SERVER['REMOTE_ADDR']) ? (string) $_SERVER['REMOTE_ADDR'] : '';
    $ua = isset($_SERVER['HTTP_USER_AGENT']) ? (string) $_SERVER['HTTP_USER_AGENT'] : '';
    return substr(hash('sha256', $wartosc . '|' . $ip . '|' . $ua), 0, 32);
}

/** Czy to bot. Lista skrotowa, ale lapie zdecydowana wiekszosc ruchu maszynowego. */
function stat_bot(string $ua): bool
{
    if ($ua === '') {
        return true;
    }
    return (bool) preg_match(
        '~bot|crawl|spider|slurp|archiver|monitor|preview|headless|lighthouse|curl|wget|python|java/|okhttp|scrapy|semrush|ahrefs|mj12|dotbot|petal|bytespider~i',
        $ua
    );
}

/** Telefon, tablet czy komputer - z samego User-Agenta, bez odcisku urzadzenia. */
function stat_urzadzenie(string $ua): string
{
    if (preg_match('~iPad|Tablet~i', $ua)) {
        return 'tablet';
    }
    if (preg_match('~Mobi|Android|iPhone|iPod~i', $ua)) {
        return 'telefon';
    }
    return 'komputer';
}

/**
 * Limit prob logowania do panelu. Haslo bywa krotkie, wiec bez tego wystarczylby
 * bot strzelajacy slownikiem. Liczymy nieudane proby z ostatniego kwadransa dla
 * danego odcisku (ten sam nieodwracalny skrot co przy liczeniu osob - adresu IP
 * nadal nigdzie nie zapisujemy).
 */
function stat_limit_tabela(SQLite3 $db): void
{
    $db->exec('CREATE TABLE IF NOT EXISTS proby (odcisk TEXT NOT NULL, kiedy INTEGER NOT NULL)');
    $db->exec('CREATE INDEX IF NOT EXISTS proby_kiedy ON proby (kiedy)');
}

/** Ile nieudanych prob w ostatnich $okno sekundach. */
function stat_proby(SQLite3 $db, string $odcisk, int $okno = 900): int
{
    stat_limit_tabela($db);
    $db->exec('DELETE FROM proby WHERE kiedy < ' . (time() - 86400));
    $s = $db->prepare('SELECT COUNT(*) AS ile FROM proby WHERE odcisk = :o AND kiedy > :od');
    $s->bindValue(':o', $odcisk, SQLITE3_TEXT);
    $s->bindValue(':od', time() - $okno, SQLITE3_INTEGER);
    $w = $s->execute()->fetchArray(SQLITE3_ASSOC);
    return $w === false ? 0 : (int) $w['ile'];
}

/** Zapisuje nieudana probe. */
function stat_proba_nieudana(SQLite3 $db, string $odcisk): void
{
    stat_limit_tabela($db);
    $s = $db->prepare('INSERT INTO proby (odcisk, kiedy) VALUES (:o, :k)');
    $s->bindValue(':o', $odcisk, SQLITE3_TEXT);
    $s->bindValue(':k', time(), SQLITE3_INTEGER);
    $s->execute();
}

/** Po udanym logowaniu licznik zeruje sie. */
function stat_proby_kasuj(SQLite3 $db, string $odcisk): void
{
    stat_limit_tabela($db);
    $s = $db->prepare('DELETE FROM proby WHERE odcisk = :o');
    $s->bindValue(':o', $odcisk, SQLITE3_TEXT);
    $s->execute();
}
