const FLASH_MAPLE_DEFAULT_DEVICE_NAME = "FlashMaple Web";

export async function getDeviceName() {
  if (typeof navigator === "undefined") return FLASH_MAPLE_DEFAULT_DEVICE_NAME;
  return navigator.userAgent?.trim() || FLASH_MAPLE_DEFAULT_DEVICE_NAME;
}
