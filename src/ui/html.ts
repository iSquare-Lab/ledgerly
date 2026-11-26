// Small DOM helpers shared by the renderers and dialogs.

const ENTITIES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escapes text for use in HTML, both as element content and inside quoted attribute values. */
export const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => ENTITIES[c]);

/** The element with this id; the page always has it. */
export const $ = <T extends HTMLElement = HTMLElement>(id: string): T => document.getElementById(id) as T;
