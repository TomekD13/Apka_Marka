<?php
// Wspolna czesc anonimowych statystyk. Zapisujemy zdarzenia zbiorcze, nie profile ludzi.

declare(strict_types=1);

function stat_katalog(): string
{
    return __DIR__;
}

function stat_config(): array
{
    $path = stat_katalog() . '/config.php';
    if (!is_file($path)) {
        return array();
    }
    $config = include $path;
    return is_array($config) ? $config : array();
}

function stat_baza(): SQLite3
{
    $db = new SQLite3(stat_katalog() . '/dane.sqlite');
    $db->busyTimeout(4000);
    $db->exec('PRAGMA journal_mode = WAL');
    $db->exec('CREATE TABLE IF NOT EXISTS odslony (
        dzien TEXT NOT NULL, sciezka TEXT NOT NULL, zrodlo TEXT NOT NULL DEFAULT "",
        urzadzenie TEXT NOT NULL DEFAULT "", ile INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (dzien, sciezka, zrodlo, urzadzenie)
    )');
    $db->exec('CREATE TABLE IF NOT EXISTS wizyty (
        dzien TEXT NOT NULL, odcisk TEXT NOT NULL, PRIMARY KEY (dzien, odcisk)
    )');
    $db->exec('CREATE TABLE IF NOT EXISTS zdarzenia (
        dzien TEXT NOT NULL, nazwa TEXT NOT NULL, ile INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (dzien, nazwa)
    )');
    $db->exec('CREATE TABLE IF NOT EXISTS sol (dzien TEXT PRIMARY KEY, wartosc TEXT NOT NULL)');
    return $db;
}

function stat_odcisk_dnia(SQLite3 $db, string $dzien): string
{
    $select = $db->prepare('SELECT wartosc FROM sol WHERE dzien = :d');
    $select->bindValue(':d', $dzien, SQLITE3_TEXT);
    $row = $select->execute()->fetchArray(SQLITE3_ASSOC);
    if ($row === false) {
        $salt = bin2hex(random_bytes(16));
        $insert = $db->prepare('INSERT OR IGNORE INTO sol (dzien, wartosc) VALUES (:d, :s)');
        $insert->bindValue(':d', $dzien, SQLITE3_TEXT);
        $insert->bindValue(':s', $salt, SQLITE3_TEXT);
        $insert->execute();
        $db->exec('DELETE FROM sol WHERE dzien < date("now", "-2 day")');
    } else {
        $salt = (string) $row['wartosc'];
    }
    $ip = isset($_SERVER['REMOTE_ADDR']) ? (string) $_SERVER['REMOTE_ADDR'] : '';
    $ua = isset($_SERVER['HTTP_USER_AGENT']) ? (string) $_SERVER['HTTP_USER_AGENT'] : '';
    return substr(hash('sha256', $salt . '|' . $ip . '|' . $ua), 0, 32);
}

function stat_bot(string $ua): bool
{
    return $ua === '' || (bool) preg_match(
        '~bot|crawl|spider|slurp|archiver|monitor|preview|headless|lighthouse|curl|wget|python|java/|okhttp|scrapy|semrush|ahrefs|mj12|dotbot|petal|bytespider~i',
        $ua
    );
}

function stat_urzadzenie(string $ua): string
{
    if (preg_match('~iPad|Tablet~i', $ua)) return 'tablet';
    if (preg_match('~Mobi|Android|iPhone|iPod~i', $ua)) return 'telefon';
    return 'komputer';
}

function stat_proby_tabela(SQLite3 $db): void
{
    $db->exec('CREATE TABLE IF NOT EXISTS proby (odcisk TEXT NOT NULL, kiedy INTEGER NOT NULL)');
    $db->exec('CREATE INDEX IF NOT EXISTS proby_kiedy ON proby (kiedy)');
}

function stat_proby(SQLite3 $db, string $odcisk, int $okno): int
{
    stat_proby_tabela($db);
    $db->exec('DELETE FROM proby WHERE kiedy < ' . (time() - 86400));
    $select = $db->prepare('SELECT COUNT(*) AS ile FROM proby WHERE odcisk = :o AND kiedy > :k');
    $select->bindValue(':o', $odcisk, SQLITE3_TEXT);
    $select->bindValue(':k', time() - $okno, SQLITE3_INTEGER);
    $row = $select->execute()->fetchArray(SQLITE3_ASSOC);
    return $row === false ? 0 : (int) $row['ile'];
}

function stat_zapisz_probe(SQLite3 $db, string $odcisk): void
{
    stat_proby_tabela($db);
    $insert = $db->prepare('INSERT INTO proby (odcisk, kiedy) VALUES (:o, :k)');
    $insert->bindValue(':o', $odcisk, SQLITE3_TEXT);
    $insert->bindValue(':k', time(), SQLITE3_INTEGER);
    $insert->execute();
}

function stat_wyczysc_proby(SQLite3 $db, string $odcisk): void
{
    $delete = $db->prepare('DELETE FROM proby WHERE odcisk = :o');
    $delete->bindValue(':o', $odcisk, SQLITE3_TEXT);
    $delete->execute();
}

function stat_h(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}
