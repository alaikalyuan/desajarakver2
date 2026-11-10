// Village help desk WhatsApp number in international format without "+",
// e.g. "6281234567890". Set NEXT_PUBLIC_HELP_WHATSAPP in the environment.
// When unset, help links are hidden instead of pointing at a fake number.
export const HELP_WHATSAPP = (process.env.NEXT_PUBLIC_HELP_WHATSAPP || "").replace(
  /\D/g,
  ""
);

export function helpWhatsAppUrl(message: string): string | null {
  if (!HELP_WHATSAPP) return null;
  return `https://wa.me/${HELP_WHATSAPP}?text=${encodeURIComponent(message)}`;
}

/**
 * Indonesian phone number to the international digits WhatsApp expects.
 * "0812-3456-7890" -> "6281234567890", "+62 812..." -> "62812...".
 * Returns null when it does not look like a phone number.
 */
export function toWhatsAppNumber(phone: string | null | undefined): string | null {
  let digits = String(phone ?? "").replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `62${digits.slice(1)}`;
  else if (digits.startsWith("8")) digits = `62${digits}`;
  if (!digits.startsWith("62") || digits.length < 10 || digits.length > 15) return null;
  return digits;
}

/** https://wa.me link for a phone number, or null when the number is not usable. */
export function whatsAppUrl(phone: string | null | undefined, message?: string): string | null {
  const number = toWhatsAppNumber(phone);
  if (!number) return null;
  return message
    ? `https://wa.me/${number}?text=${encodeURIComponent(message)}`
    : `https://wa.me/${number}`;
}

/** tel: link for a phone number, or null when the number is not usable. */
export function telUrl(phone: string | null | undefined): string | null {
  const number = toWhatsAppNumber(phone);
  return number ? `tel:+${number}` : null;
}
