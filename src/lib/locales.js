export const locales = {
  en: {
    createTicket: 'Create a ticket', chooseTopic: 'Choose a topic', chooseLanguage: 'Choose a language',
    choosePriority: 'Choose a priority', submit: 'Open ticket', required: 'Required',
    close: 'Close the Ticket', claim: 'Claim the Ticket', aiOpinion: 'Ask for AI opinion',
    modChat: 'Mod Chat', priorityButton: 'Change the Priority',
    ticketOpened: 'Your ticket is open. A moderator will be with you as soon as possible.',
    closed: 'Ticket closed.', claimed: 'Ticket claimed by {user}.',
    noTopics: 'This panel has no topics configured yet.', formTitle: 'Ticket details',
    reviewTitle: 'Application review (rule-based, not an AI authorship detector)',
    heuristic: 'Text pattern indicator: {score}/100. This is not proof of AI authorship.',
    priority: ['Turtle 🐢', 'Low 🟢', 'Standard ⚪', 'High 🔴', 'World-collapsing ☄️'],
  },
  pl: {
    createTicket: 'Utwórz zgłoszenie', chooseTopic: 'Wybierz temat', chooseLanguage: 'Wybierz język',
    choosePriority: 'Wybierz priorytet', submit: 'Otwórz zgłoszenie', required: 'Wymagane',
    close: 'Zamknij zgłoszenie', claim: 'Przejmij zgłoszenie', aiOpinion: 'Poproś o opinię AI',
    modChat: 'Czat moderacji', priorityButton: 'Zmień priorytet',
    ticketOpened: 'Zgłoszenie jest otwarte. Moderacja odpowie, gdy tylko będzie mogła.',
    closed: 'Zgłoszenie zamknięte.', claimed: 'Zgłoszenie przejął {user}.',
    noTopics: 'Ten panel nie ma jeszcze tematów.', formTitle: 'Szczegóły zgłoszenia',
    reviewTitle: 'Ocena aplikacji (regułowa, nie wykrywa autorstwa AI)',
    heuristic: 'Wskaźnik wzorców tekstu: {score}/100. To nie jest dowód autorstwa AI.',
    priority: ['Żółw 🐢', 'Niski 🟢', 'Standardowy ⚪', 'Wysoki 🔴', 'Katastrofalny ☄️'],
  },
  de: {
    createTicket: 'Ticket erstellen', chooseTopic: 'Thema wählen', chooseLanguage: 'Sprache wählen',
    choosePriority: 'Priorität wählen', submit: 'Ticket öffnen', required: 'Erforderlich',
    close: 'Ticket schließen', claim: 'Ticket übernehmen', aiOpinion: 'Um KI-Meinung bitten',
    modChat: 'Moderationschat', priorityButton: 'Priorität ändern',
    ticketOpened: 'Dein Ticket ist offen. Die Moderation meldet sich so bald wie möglich.',
    closed: 'Ticket geschlossen.', claimed: 'Ticket übernommen von {user}.',
    noTopics: 'Für dieses Panel sind noch keine Themen eingerichtet.', formTitle: 'Ticketdetails',
    reviewTitle: 'Anwendungsprüfung (regelbasiert, kein KI-Autorendetektor)',
    heuristic: 'Textmuster-Indikator: {score}/100. Kein Beweis für KI-Autorenschaft.',
    priority: ['Schildkröte 🐢', 'Niedrig 🟢', 'Standard ⚪', 'Hoch 🔴', 'Weltuntergang ☄️'],
  },
  es: {
    createTicket: 'Crear ticket', chooseTopic: 'Elige un tema', chooseLanguage: 'Elige un idioma',
    choosePriority: 'Elige prioridad', submit: 'Abrir ticket', required: 'Obligatorio',
    close: 'Cerrar ticket', claim: 'Reclamar ticket', aiOpinion: 'Pedir opinión de IA',
    modChat: 'Chat de moderación', priorityButton: 'Cambiar prioridad',
    ticketOpened: 'Tu ticket está abierto. Moderación responderá lo antes posible.',
    closed: 'Ticket cerrado.', claimed: 'Ticket reclamado por {user}.',
    noTopics: 'Este panel aún no tiene temas configurados.', formTitle: 'Detalles del ticket',
    reviewTitle: 'Revisión de solicitud (basada en reglas, no detecta autoría de IA)',
    heuristic: 'Indicador de patrones de texto: {score}/100. No demuestra autoría de IA.',
    priority: ['Tortuga 🐢', 'Baja 🟢', 'Estándar ⚪', 'Alta 🔴', 'Apocalipsis ☄️'],
  },
  fr: {
    createTicket: 'Créer un ticket', chooseTopic: 'Choisir un sujet', chooseLanguage: 'Choisir une langue',
    choosePriority: 'Choisir une priorité', submit: 'Ouvrir le ticket', required: 'Obligatoire',
    close: 'Fermer le ticket', claim: 'Prendre le ticket', aiOpinion: 'Demander un avis IA',
    modChat: 'Chat de modération', priorityButton: 'Changer la priorité',
    ticketOpened: 'Votre ticket est ouvert. La modération répondra dès que possible.',
    closed: 'Ticket fermé.', claimed: 'Ticket pris par {user}.',
    noTopics: 'Aucun sujet n’est encore configuré pour ce panneau.', formTitle: 'Détails du ticket',
    reviewTitle: 'Évaluation (règles, pas un détecteur d’auteur IA)',
    heuristic: 'Indicateur de motifs textuels : {score}/100. Ne prouve pas une origine IA.',
    priority: ['Tortue 🐢', 'Faible 🟢', 'Standard ⚪', 'Élevée 🔴', 'Apocalypse ☄️'],
  },
};

export function t(language, key, replacements = {}) {
  const messages = locales[language] ?? locales.en;
  let value = messages[key] ?? locales.en[key] ?? key;
  if (Array.isArray(value)) return value;
  return value.replace(/\{(\w+)\}/g, (_, name) => replacements[name] ?? '');
}
