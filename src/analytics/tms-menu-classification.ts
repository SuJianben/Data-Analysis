const TMS_PAGINATION_LABEL = /^(?:\d+\.\s*oldal|előző\s+oldal|következő\s+oldal)$/iu;

export function isTmsPaginationMenuLabel(value: string) {
  return TMS_PAGINATION_LABEL.test(value.trim());
}
