import whatsappLogo from "@/assets/whatsapp-logo-transparent.png";

export function WhatsAppLogo({ className = "h-5 w-5" }) {
  return (
    <img
      src={whatsappLogo}
      className={className}
      alt="WhatsApp"
      loading="lazy"
    />
  );
}
