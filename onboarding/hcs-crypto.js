/* Home Care Solutions — onboarding encryption helpers (Web Crypto only, no dependencies).
 *
 * Packets are encrypted in the employee's browser with a one-time AES-256-GCM key.
 * That key is wrapped with the admin's RSA-OAEP-3072 public key. Only the admin's
 * private key can unwrap it, and that private key is itself stored encrypted with a
 * passphrase-derived key (PBKDF2-SHA-256, 600k iterations) that never leaves the admin's browser.
 *
 * Envelope layout:  "HCS1" | uint32 header length (BE) | header JSON | AES-GCM ciphertext
 */
window.HCSCrypto = (() => {
  const subtle = crypto.subtle;
  const te = new TextEncoder(), td = new TextDecoder();
  const MAGIC = "HCS1";
  const PBKDF2_ITER = 600000;
  const RSA = { name: "RSA-OAEP", modulusLength: 3072, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" };

  function toB64(buf) {
    const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    let s = "";
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }
  function fromB64(str) {
    const s = atob(str), out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }
  const rand = n => crypto.getRandomValues(new Uint8Array(n));

  async function passphraseKey(passphrase, salt, iter) {
    const base = await subtle.importKey("raw", te.encode(passphrase.normalize("NFKC")), "PBKDF2", false, ["deriveKey"]);
    return subtle.deriveKey({ name: "PBKDF2", salt, iterations: iter, hash: "SHA-256" }, base,
                            { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  }

  /** Create a new admin key pair. Returns { publicJwk, pkcs8 (Uint8Array) }. */
  async function generateKeyPair() {
    const kp = await subtle.generateKey(RSA, true, ["encrypt", "decrypt"]);
    const publicJwk = await subtle.exportKey("jwk", kp.publicKey);
    const pkcs8 = new Uint8Array(await subtle.exportKey("pkcs8", kp.privateKey));
    return { publicJwk: { kty: publicJwk.kty, n: publicJwk.n, e: publicJwk.e, alg: "RSA-OAEP-256" }, pkcs8 };
  }

  /** Encrypt the private key bytes with a passphrase. */
  async function sealPrivateKey(pkcs8, passphrase) {
    const salt = rand(16), iv = rand(12);
    const key = await passphraseKey(passphrase, salt, PBKDF2_ITER);
    const ct = await subtle.encrypt({ name: "AES-GCM", iv }, key, pkcs8);
    return { v: 1, kdf: "PBKDF2-SHA256", iter: PBKDF2_ITER, salt: toB64(salt), iv: toB64(iv), ct: toB64(ct) };
  }

  /** Decrypt the stored private key. Throws if the passphrase is wrong. Returns { key, pkcs8 }. */
  async function openPrivateKey(sealed, passphrase) {
    const key = await passphraseKey(passphrase, fromB64(sealed.salt), sealed.iter);
    let pkcs8;
    try { pkcs8 = new Uint8Array(await subtle.decrypt({ name: "AES-GCM", iv: fromB64(sealed.iv) }, key, fromB64(sealed.ct))); }
    catch (e) { throw new Error("Incorrect passphrase"); }
    const priv = await subtle.importKey("pkcs8", pkcs8, { name: "RSA-OAEP", hash: "SHA-256" }, false, ["decrypt"]);
    return { key: priv, pkcs8 };
  }

  /** Encrypt bytes for the admin. Returns the envelope as a Uint8Array. */
  async function encryptForAdmin(publicJwk, bytes) {
    const pub = await subtle.importKey("jwk", { kty: publicJwk.kty, n: publicJwk.n, e: publicJwk.e, alg: "RSA-OAEP-256", ext: true },
                                       { name: "RSA-OAEP", hash: "SHA-256" }, false, ["encrypt"]);
    const aes = await subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt"]);
    const iv = rand(12);
    const ct = new Uint8Array(await subtle.encrypt({ name: "AES-GCM", iv }, aes, bytes));
    const wk = await subtle.encrypt({ name: "RSA-OAEP" }, pub, await subtle.exportKey("raw", aes));
    const header = te.encode(JSON.stringify({ v: 1, alg: "RSA-OAEP-256+A256GCM", wk: toB64(wk), iv: toB64(iv) }));
    const out = new Uint8Array(8 + header.length + ct.length);
    out.set(te.encode(MAGIC), 0);
    new DataView(out.buffer).setUint32(4, header.length);
    out.set(header, 8); out.set(ct, 8 + header.length);
    return out;
  }

  /** Decrypt an envelope with the admin's private CryptoKey. */
  async function decryptEnvelope(privateKey, envelope) {
    const buf = envelope instanceof Uint8Array ? envelope : new Uint8Array(envelope);
    if (td.decode(buf.subarray(0, 4)) !== MAGIC) throw new Error("Not an HCS onboarding file");
    const hlen = new DataView(buf.buffer, buf.byteOffset).getUint32(4);
    const header = JSON.parse(td.decode(buf.subarray(8, 8 + hlen)));
    const raw = await subtle.decrypt({ name: "RSA-OAEP" }, privateKey, fromB64(header.wk));
    const aes = await subtle.importKey("raw", raw, "AES-GCM", false, ["decrypt"]);
    return new Uint8Array(await subtle.decrypt({ name: "AES-GCM", iv: fromB64(header.iv) }, aes, buf.subarray(8 + hlen)));
  }

  return { generateKeyPair, sealPrivateKey, openPrivateKey, encryptForAdmin, decryptEnvelope, toB64, fromB64 };
})();
