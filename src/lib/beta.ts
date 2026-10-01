// Wydanie testowe (/beta/) i dev. Nowosci, ktore maja najpierw trafic tylko na bete,
// chowamy za ta flaga - wydanie strony glownej z tego samego repo ich nie pokaze.
export const BETA = import.meta.env.DEV || import.meta.env.BASE_URL === '/beta/'
