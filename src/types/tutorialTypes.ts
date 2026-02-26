export type TutorialLevel = "beginner" | "intermediate" | "pro";

export type TutorialContentBlock =
  | { type: "text"; value: string }
  | { type: "list"; items: string[] }
  | { type: "step"; title: string; value: string; tip?: string }
  | { type: "alert"; title: string; value: string; level: "info" | "warning" | "danger" }
  | { type: "formula"; title: string; value: string }
  | { type: "image"; src: string; alt: string; caption?: string }; // ✅ AJOUT

export interface TutorialSection {
  title: string;
  content: TutorialContentBlock[];
}

export interface Tutorial {
  id: string; // Correspond souvent à CalculatorType
  title: string;
  category: "Gros Œuvre" | "Second Œuvre" | "Finitions" | "Sols" | "Technique" | "Extérieur";
  level: TutorialLevel;
  duration: string; // ex: "5 min"
  lastUpdated: string;
  tags: string[];
  intro: string;
  prerequisites: string[]; // Données à préparer
  sections: TutorialSection[];
  faq: { question: string; answer: string }[];
}
