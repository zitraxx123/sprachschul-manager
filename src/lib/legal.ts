/**
 * Provider details for the public legal pages (Impressum, Datenschutz).
 *
 * TODO (owner): replace the placeholder values (company, street, zip, city, responsible person) with the real
 * data before the first customer sees the site. Empty `phone` / `vatId` hide their sections on the Impressum:
 * fill them in only with real values (the VAT ID is required if the provider has one).
 */
export const LEGAL = {
  company: "Klasswerk SaaS",
  street: "Musterstraße 42",
  zip: "10115",
  city: "Berlin",
  country: "Deutschland",
  phone: "",
  email: "studiowebnord@gmail.com",
  vatId: "",
  responsible: "Max Mustermann",
} as const;
