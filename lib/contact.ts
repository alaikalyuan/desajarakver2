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
