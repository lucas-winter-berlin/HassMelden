import type { Complainant, Platform } from "@/lib/types";

export type DemoScenario = {
  id: string;
  title: string;
  blurb: string;
  platform: Platform;
  sourceUrl: string;
  profileUrl: string;
  accountId?: string;
  /** Relative hours before now for incidentDate */
  hoursAgo: number;
  userContext: string;
  complainant: Complainant;
  /** Fake feed lines rendered into generated screenshot(s) */
  screenshots: Array<{
    handle: string;
    platformLabel: string;
    lines: string[];
  }>;
};

/**
 * Fiktive Demo-Szenarien nur für Prototyp-Präsentationen.
 * Keine echten Vorfälle – klar als TEST gekennzeichnet.
 */
export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: "x-insult",
    title: "X: Beleidigung",
    blurb: "Einzelner Post mit queerfeindlicher Beleidigung",
    platform: "X",
    sourceUrl: "https://example.com/demo/x-status/demo-001",
    profileUrl: "https://x.com/demo_hetzer_x",
    accountId: "demo-uid-10001",
    hoursAgo: 6,
    userContext:
      "[DEMO] Ich habe den Post heute Morgen gesehen und screenshotet. Der Account hat mich zuvor schon mehrfach angeschrieben.",
    complainant: {
      fullName: "Alex Muster",
      street: "Demostraße 12",
      zip: "10115",
      city: "Berlin",
      email: "alex.muster@example.com",
      phone: "030 1234567",
      addressDisclosure: "full",
    },
    screenshots: [
      {
        handle: "@demo_hetzer_x",
        platformLabel: "X · Demo",
        lines: [
          "DEMO – KEIN ECHTER INHALT",
          "",
          "@demo_hetzer_x · vor 6 Std.",
          "„Leute wie du gehören nicht in den",
          "öffentlichen Raum. Verschwinde,“",
          "gerichtet an @queer_demo_user",
        ],
      },
    ],
  },
  {
    id: "ig-thread",
    title: "Instagram: Kommentarverlauf",
    blurb: "Zwei Screenshots + geschützte Zustelladresse",
    platform: "INSTAGRAM",
    sourceUrl: "https://example.com/demo/ig/p/demo-thread",
    profileUrl: "https://www.instagram.com/demo_kommentar_ig/",
    accountId: "17841400000000000",
    hoursAgo: 26,
    userContext:
      "[DEMO] Kommentar unter meinem Pride-Post. Der Verlauf geht über zwei Screenshots.",
    complainant: {
      fullName: "Jordan Beispiel",
      street: "Testring 4",
      zip: "80331",
      city: "München",
      email: "jordan.beispiel@example.com",
      addressDisclosure: "protected",
      deliveryNote:
        "Zustellung erbeten über HassMelden-Demo-Beratung / Postfach 12345, 80331 München",
    },
    screenshots: [
      {
        handle: "@demo_kommentar_ig",
        platformLabel: "Instagram · Demo",
        lines: [
          "DEMO – KEIN ECHTER INHALT",
          "",
          "Beitrag von @queer_demo_user",
          "— Kommentare —",
          "@demo_kommentar_ig: „Widerlich.",
          "Sowas gehört verboten.“",
        ],
      },
      {
        handle: "@demo_kommentar_ig",
        platformLabel: "Instagram · Demo (2)",
        lines: [
          "DEMO – Fortsetzung",
          "",
          "@demo_kommentar_ig: „Hoffentlich",
          "passiert euch was. Bleibt weg.“",
          "@freund_demo: meldet das bitte",
        ],
      },
    ],
  },
  {
    id: "fb-group",
    title: "Facebook: Gruppenpost",
    blurb: "Hetzerischer Post in einer lokalen Gruppe",
    platform: "FACEBOOK",
    sourceUrl: "https://example.com/demo/fb/groups/demo-stadt",
    profileUrl: "https://www.facebook.com/demo.hetzer",
    accountId: "100000000000001",
    hoursAgo: 48,
    userContext:
      "[DEMO] Gefunden in der Facebook-Gruppe „Stadt Demo – Tipps“. Ich bin Mitglied und fühle mich bedroht.",
    complainant: {
      fullName: "Sam Probe",
      street: "Beispielweg 9",
      zip: "20095",
      city: "Hamburg",
      email: "sam.probe@example.com",
      phone: "040 998877",
      addressDisclosure: "full",
    },
    screenshots: [
      {
        handle: "Demo Hetzer",
        platformLabel: "Facebook · Demo",
        lines: [
          "DEMO – KEIN ECHTER INHALT",
          "",
          "Gruppe: Stadt Demo – Tipps",
          "Demo Hetzer · vor 2 Tagen",
          "„Pride-Demo absagen. Die gehören",
          "hier nicht hin – raus mit euch.“",
        ],
      },
    ],
  },
  {
    id: "tt-threat",
    title: "TikTok: Bedrohung",
    blurb: "Kommentar mit Bedrohung unter Video",
    platform: "TIKTOK",
    sourceUrl: "https://example.com/demo/tiktok/video/demo-99",
    profileUrl: "https://www.tiktok.com/@demo_threat_tt",
    accountId: "MS4wLjABAAAA-demo-tt",
    hoursAgo: 3,
    userContext:
      "[DEMO] Unter meinem Coming-out-Video. Profil wirkt neu angelegt.",
    complainant: {
      fullName: "Riley Testperson",
      street: "Prototypgasse 1",
      zip: "50667",
      city: "Köln",
      email: "riley.test@example.com",
      addressDisclosure: "protected",
      deliveryNote:
        "Zustellung erbeten über Rechtsanwältin Demo, Kanzlei Muster, 50667 Köln",
    },
    screenshots: [
      {
        handle: "@demo_threat_tt",
        platformLabel: "TikTok · Demo",
        lines: [
          "DEMO – KEIN ECHTER INHALT",
          "",
          "Kommentare",
          "@demo_threat_tt: „Ich weiß wo du",
          "wohnst. Pass auf dich auf –",
          "nächstes Mal sehen wir uns.“",
        ],
      },
    ],
  },
  {
    id: "x-positive",
    title: "X: Positivbeispiel (kein Delikt)",
    blurb: "Harmloser Support-Kommentar – KI sollte keinen Tatverdacht melden",
    platform: "X",
    sourceUrl: "https://example.com/demo/x-status/demo-positive-001",
    profileUrl: "https://x.com/demo_ally_x",
    accountId: "demo-uid-90001",
    hoursAgo: 4,
    userContext:
      "[DEMO · POSITIVBEISPIEL] Bitte prüfen: Ich bin unsicher, ob das überhaupt strafrechtlich relevant ist. Erwarte Feedback ohne Beleidigungs-/Hetze-/Bedrohungs-Verdacht, falls der Inhalt harmlos ist.",
    complainant: {
      fullName: "Kim Kontrolle",
      street: "Prüfweg 3",
      zip: "10115",
      city: "Berlin",
      email: "kim.kontrolle@example.com",
      addressDisclosure: "full",
    },
    screenshots: [
      {
        handle: "@demo_ally_x",
        platformLabel: "X · Demo (Positiv)",
        lines: [
          "DEMO – KEIN ECHTER INHALT · POSITIVBEISPIEL",
          "",
          "@demo_ally_x · vor 4 Std.",
          "Antwort an @queer_demo_user:",
          "„Danke fürs Teilen – du bist mutig.",
          "Solidarität und alles Gute!“",
        ],
      },
    ],
  },
];

export function incidentDateHoursAgo(hoursAgo: number): string {
  const d = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
