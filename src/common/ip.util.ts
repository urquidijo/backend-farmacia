export function normalizeIp(input?: string | null): string {
  if (!input) return '0.0.0.0';
  let ip = input;
  // X-Forwarded-For puede traer "ip1, ip2, ip3"
  if (ip.includes(',')) ip = ip.split(',')[0].trim();
  // IPv6 mapeado a IPv4
  if (ip.startsWith('::ffff:')) ip = ip.slice(7);
  // Loopback IPv6
  if (ip === '::1') ip = '127.0.0.1';
  return ip;
}
