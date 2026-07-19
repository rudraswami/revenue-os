/** Whether to show the global "Connect WhatsApp" shell banner. */
export function shouldShowWhatsappConnectBanner(params: {
  hasToken: boolean;
  isAgency: boolean;
  accounts: Array<{ isActive: boolean }> | undefined;
  persistedWhatsappConnected: boolean | undefined;
}): boolean {
  if (!params.hasToken || params.isAgency) return false;

  if (params.accounts != null) {
    return !params.accounts.some((a) => a.isActive);
  }

  // Still loading — never flash "connect" when session already says connected.
  if (params.persistedWhatsappConnected === true) return false;

  return false;
}
