import type Database from 'better-sqlite3';
import { nowIso } from '../utils/time.js';

/** Startbestand für den Challenge-Generator. Kann im Admin-Panel erweitert werden. */
const SUBJECTS: Array<[string, string]> = [
  ['Spiegelungen', 'Pfützen, Fenster, Wasserflächen – finde eine Welt, die sich selbst betrachtet.'],
  ['Schatten', 'Der Schatten ist dein Motiv, nicht das Objekt, das ihn wirft.'],
  ['Minimalismus', 'Weniger ist mehr: ein Motiv, viel Raum, klare Linien.'],
  ['Goldene Stunde', 'Das warme, weiche Licht kurz nach Sonnenaufgang oder vor Sonnenuntergang.'],
  ['Blaue Stunde', 'Die Zeit zwischen Tag und Nacht, wenn der Himmel tiefblau leuchtet.'],
  ['Texturen', 'Rinde, Stoff, Beton, Rost – mach Oberflächen fühlbar.'],
  ['Symmetrie', 'Suche nach perfekter Balance – oder breche sie bewusst.'],
  ['Straßenfotografie', 'Ungestellte Momente aus dem öffentlichen Leben.'],
  ['Bewegung', 'Zeige Dynamik: eingefroren oder als Wischer.'],
  ['Fenster & Türen', 'Übergänge, Rahmen, Ein- und Ausblicke.'],
  ['Linien', 'Führende Linien, die den Blick durch das Bild lenken.'],
  ['Natur im Detail', 'Makro oder nah dran: Blätter, Insekten, Tautropfen.'],
  ['Stadt bei Nacht', 'Lichter, Neon, Langzeitbelichtungen.'],
  ['Porträt ohne Gesicht', 'Erzähle etwas über einen Menschen, ohne sein Gesicht zu zeigen.'],
  ['Farbe Rot', 'Rot als dominierendes Element im Bild.'],
  ['Alltagsgegenstände', 'Mach das Gewöhnliche außergewöhnlich.'],
  ['Wasser', 'Fließend, gefroren, verdampft – Wasser in all seinen Formen.'],
  ['Architektur', 'Gebäude, Strukturen, Perspektiven.'],
  ['Einsamkeit', 'Ein einzelnes Element in einer weiten Umgebung.'],
  ['Kontraste', 'Hell und dunkel, alt und neu, weich und hart.'],
  ['Wetter', 'Regen, Nebel, Sturm oder gleißende Sonne.'],
  ['Muster', 'Wiederholungen, die ein Bild füllen – und die eine Ausnahme.'],
  ['Essen', 'Food-Fotografie: vom Marktstand bis zum Teller.'],
  ['Vergänglichkeit', 'Verfall, Abnutzung, Spuren der Zeit.'],
];

const TWISTS: Array<[string, string]> = [
  ['Nur Schwarz-Weiß', 'Das Bild muss monochrom sein.'],
  ['Nur Festbrennweite', 'Keine Zoom-Ausnahmen – nutze eine feste Brennweite.'],
  ['Hochformat', 'Das Bild muss im Hochformat sein.'],
  ['Froschperspektive', 'Fotografiere von ganz unten.'],
  ['Offenblende', 'Fotografiere mit der größtmöglichen Blendenöffnung.'],
  ['Langzeitbelichtung', 'Belichtungszeit von mindestens einer Sekunde.'],
  ['Nur Smartphone', 'Lass die Kamera zu Hause.'],
  ['Vogelperspektive', 'Fotografiere von oben herab.'],
  ['Quadratisch', 'Das Bild muss im Format 1:1 sein.'],
  ['Unter 100 m von zu Hause', 'Finde dein Motiv in unmittelbarer Nähe.'],
];

export function seedThemes(db: Database.Database): void {
  const count = db.prepare('SELECT COUNT(*) AS n FROM challenge_themes').get() as { n: number };
  if (count.n > 0) return;
  const insert = db.prepare(
    'INSERT INTO challenge_themes (kind, title, description, created_at) VALUES (?, ?, ?, ?)',
  );
  const now = nowIso();
  db.transaction(() => {
    for (const [title, description] of SUBJECTS) insert.run('subject', title, description, now);
    for (const [title, description] of TWISTS) insert.run('twist', title, description, now);
  })();
}
