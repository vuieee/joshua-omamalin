const form = document.getElementById("subnetForm");
const ipInput = document.getElementById("ipAddress");
const prefixInput = document.getElementById("prefixLength");
const hostsInput = document.getElementById("hostsNeeded");
const errorMessage = document.getElementById("subnetError");
const capacityResult = document.getElementById("capacityResult");
const numberFormat = new Intl.NumberFormat();
const maxIPv4 = 0xffffffffn;

function parseIPv4(value) {
  const parts = value.trim().split(".");
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part))) {
    return null;
  }

  const octets = parts.map(Number);
  if (octets.some((octet) => octet > 255)) {
    return null;
  }

  return octets.reduce((address, octet) => (address << 8n) | BigInt(octet), 0n);
}

function formatIPv4(address) {
  return [24n, 16n, 8n, 0n]
    .map((shift) => Number((address >> shift) & 255n))
    .join(".");
}

function formatBinary(address) {
  return [24n, 16n, 8n, 0n]
    .map((shift) => Number((address >> shift) & 255n).toString(2).padStart(8, "0"))
    .join(".");
}

function usableCount(prefix) {
  const addresses = 2n ** BigInt(32 - prefix);
  if (prefix === 32) return 1n;
  if (prefix === 31) return 2n;
  return addresses - 2n;
}

function findMinimumPrefix(requiredHosts) {
  for (let prefix = 32; prefix >= 0; prefix -= 1) {
    if (usableCount(prefix) >= requiredHosts) return prefix;
  }
  return null;
}

function setResult(id, value) {
  document.getElementById(id).textContent = value;
}

function formatCount(value) {
  return numberFormat.format(Number(value));
}

function showError(message, invalidField) {
  errorMessage.textContent = message;
  errorMessage.hidden = false;
  [ipInput, prefixInput, hostsInput].forEach((input) => input.removeAttribute("aria-invalid"));
  if (invalidField) invalidField.setAttribute("aria-invalid", "true");
}

function clearError() {
  errorMessage.textContent = "";
  errorMessage.hidden = true;
  [ipInput, prefixInput, hostsInput].forEach((input) => input.removeAttribute("aria-invalid"));
}

function calculate() {
  clearError();

  const address = parseIPv4(ipInput.value);
  if (address === null) {
    showError("Enter a valid IPv4 address, for example 192.168.1.10.", ipInput);
    return;
  }

  if (!/^\d+$/.test(prefixInput.value) || Number(prefixInput.value) < 0 || Number(prefixInput.value) > 32) {
    showError("Prefix length must be a whole number from 0 to 32.", prefixInput);
    return;
  }

  const prefix = Number(prefixInput.value);
  const hasHostRequirement = hostsInput.value.trim() !== "";
  let requiredHosts = null;
  if (hasHostRequirement) {
    if (!/^\d+$/.test(hostsInput.value) || BigInt(hostsInput.value) < 1n || BigInt(hostsInput.value) > 4294967294n) {
      showError("Hosts needed must be a whole number between 1 and 4,294,967,294.", hostsInput);
      return;
    }
    requiredHosts = BigInt(hostsInput.value);
  }

  const mask = prefix === 0 ? 0n : (maxIPv4 << BigInt(32 - prefix)) & maxIPv4;
  const wildcard = maxIPv4 ^ mask;
  const network = address & mask;
  const broadcast = network | wildcard;
  const totalAddresses = 2n ** BigInt(32 - prefix);
  const usableHosts = usableCount(prefix);
  const firstHost = prefix >= 31 ? network : network + 1n;
  const lastHost = prefix >= 31 ? broadcast : broadcast - 1n;

  setResult("cidrResult", `${formatIPv4(address)}/${prefix}`);
  setResult("networkAddress", formatIPv4(network));
  setResult("broadcastAddress", formatIPv4(broadcast));
  setResult("subnetMask", formatIPv4(mask));
  setResult("wildcardMask", formatIPv4(wildcard));
  setResult("firstHost", formatIPv4(firstHost));
  setResult("lastHost", formatIPv4(lastHost));
  setResult("totalAddresses", formatCount(totalAddresses));
  setResult("usableHosts", formatCount(usableHosts));
  setResult("networkBits", `${prefix} bits`);
  setResult("hostBits", `${32 - prefix} bits`);
  setResult("binaryAddress", formatBinary(address));

  capacityResult.hidden = requiredHosts === null;
  if (requiredHosts !== null) {
    const minimumPrefix = findMinimumPrefix(requiredHosts);
    if (requiredHosts <= usableHosts) {
      const available = usableHosts - requiredHosts;
      setResult("capacitySummary", `${formatCount(usableHosts)} usable hosts; ${formatCount(requiredHosts)} needed, leaving ${formatCount(available)} unused host slots.`);
    } else {
      setResult("capacitySummary", `This subnet has ${formatCount(usableHosts)} usable hosts, ${formatCount(requiredHosts - usableHosts)} fewer than needed.`);
    }
    setResult("minimumSubnet", `Smallest subnet for ${formatCount(requiredHosts)} hosts: /${minimumPrefix} (${formatCount(usableCount(minimumPrefix))} usable hosts; ${formatCount(usableCount(minimumPrefix) - requiredHosts)} spare).`);
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  calculate();
});

[ipInput, prefixInput, hostsInput].forEach((input) => {
  input.addEventListener("input", () => {
    if (!errorMessage.hidden) clearError();
  });
});

calculate();
