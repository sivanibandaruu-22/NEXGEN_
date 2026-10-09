import dns from "node:dns/promises";
import net from "node:net";

export interface SafeFetchOptions {
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
}

/**
 * Validates whether an IP address belongs to private, loopback, or cloud metadata ranges.
 */
export function isPrivateOrReservedIP(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split(".").map(Number);
    const [b0, b1, b2, b3] = parts;

    // 127.0.0.0/8 - Loopback
    if (b0 === 127) return true;

    // 10.0.0.0/8 - Private Class A
    if (b0 === 10) return true;

    // 172.16.0.0/12 - Private Class B (172.16.0.0 - 172.31.255.255)
    if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;

    // 192.168.0.0/16 - Private Class C
    if (b0 === 192 && b1 === 168) return true;

    // 169.254.0.0/16 - Link-local & Cloud Metadata endpoint (169.254.169.254)
    if (b0 === 169 && b1 === 254) return true;

    // 0.0.0.0/8 - Current network
    if (b0 === 0) return true;

    // 100.64.0.0/10 - Shared address / CGNAT
    if (b0 === 100 && b1 >= 64 && b1 <= 127) return true;

    // 224.0.0.0/4 - Multicast
    if (b0 >= 224 && b0 <= 239) return true;

    // 240.0.0.0/4 - Reserved
    if (b0 >= 240) return true;

    return false;
  }

  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    // Loopback ::1
    if (lower === "::1" || lower === "0:0:0:0:0:0:0:1") return true;
    // Unique Local Addresses fc00::/7
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
    // Link-local fe80::/10
    if (lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb")) return true;
    // IPv4-mapped IPv6 ::ffff:127.0.0.1
    if (lower.includes("::ffff:")) {
      const ipv4Part = lower.split("::ffff:")[1];
      if (ipv4Part && net.isIPv4(ipv4Part)) {
        return isPrivateOrReservedIP(ipv4Part);
      }
    }
    return false;
  }

  return true; // If neither IPv4 nor IPv6, treat as invalid/hostile
}

/**
 * Validates a target URL against SSRF threats, resolving DNS to detect rebinding.
 */
export async function validateSafeOutboundUrl(rawUrl: string): Promise<{
  safe: boolean;
  resolvedIp?: string;
  error?: string;
}> {
  try {
    const parsed = new URL(rawUrl);

    // 1. Protocol check: strict HTTP / HTTPS only
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { safe: false, error: `Disallowed protocol: '${parsed.protocol}'. Only http/https supported.` };
    }

    const hostname = parsed.hostname;

    // 2. Direct IP check
    if (net.isIP(hostname)) {
      if (isPrivateOrReservedIP(hostname)) {
        return { safe: false, error: `Blocked private or cloud metadata IP address: ${hostname}` };
      }
      return { safe: true, resolvedIp: hostname };
    }

    // 3. DNS Resolution check
    const lookupResult = await dns.lookup(hostname, { all: true });
    if (!lookupResult || lookupResult.length === 0) {
      return { safe: false, error: `Could not resolve hostname '${hostname}'.` };
    }

    for (const entry of lookupResult) {
      if (isPrivateOrReservedIP(entry.address)) {
        return {
          safe: false,
          resolvedIp: entry.address,
          error: `Hostname '${hostname}' resolved to private/forbidden IP address ${entry.address}.`,
        };
      }
    }

    return { safe: true, resolvedIp: lookupResult[0].address };
  } catch (err: any) {
    return { safe: false, error: err.message || "Invalid URL syntax." };
  }
}
