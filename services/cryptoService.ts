
/**
 * Crypto Service
 * Handles client-side encryption, decryption, key generation, and key wrapping for E2EE.
 * Uses Web Crypto API.
 */

// Algorithms
const KEY_PAIR_ALGO = {
    name: 'RSA-OAEP',
    modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: 'SHA-256'
};

const ENCRYPTION_ALGO = {
    name: "AES-GCM",
    length: 256
};

// Types
export interface KeyPair {
    publicKey: CryptoKey;
    privateKey: CryptoKey;
}

export interface EncryptedData {
    ciphertext: string; // Base64
    iv: string; // Base64
}

// Helpers
const arrayBufferToBase64 = (buffer: BufferSource): string => {
    let bytes: Uint8Array;
    if (buffer instanceof Uint8Array) {
        bytes = buffer;
    } else if (ArrayBuffer.isView(buffer)) {
        bytes = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    } else {
        bytes = new Uint8Array(buffer as ArrayBuffer);
    }

    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
};

const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
};


/**
 * Generate a new RSA Key Pair
 */
export const generateKeyPair = async (): Promise<KeyPair> => {
    return window.crypto.subtle.generateKey(
        KEY_PAIR_ALGO,
        true, // extractable
        ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
    );
};

/**
 * Export Key to JSON (JWK)
 */
export const exportKey = async (key: CryptoKey): Promise<JsonWebKey> => {
    return window.crypto.subtle.exportKey('jwk', key);
};

/**
 * Import Key from JSON (JWK)
 */
export const importPublicKey = async (jwk: JsonWebKey): Promise<CryptoKey> => {
    return window.crypto.subtle.importKey(
        'jwk',
        jwk,
        KEY_PAIR_ALGO,
        true,
        ['encrypt']
    );
};

export const importPrivateKey = async (jwk: JsonWebKey): Promise<CryptoKey> => {
    return window.crypto.subtle.importKey(
        'jwk',
        jwk,
        KEY_PAIR_ALGO,
        true,
        ['decrypt']
    );
};

/**
 * Encrypt Data with Public Key (Hybrid Encryption)
 * 1. Generate AES key
 * 2. Encrypt data with AES key
 * 3. Encrypt AES key with RSA Public Key
 * 4. Return combined package
 */
export const encryptMessage = async (content: string, recipientPublicKey: CryptoKey): Promise<string> => {
    // 1. Generate AES Key
    const aesKey = await window.crypto.subtle.generateKey(
        ENCRYPTION_ALGO,
        true,
        ['encrypt']
    );

    // 2. Encrypt Content with AES Key
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encodedContent = new TextEncoder().encode(content);
    const encryptedContent = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        aesKey,
        encodedContent
    );

    // 3. Encrypt AES Key with RSA Public Key
    const rawAesKey = await window.crypto.subtle.exportKey('raw', aesKey);
    const encryptedKey = await window.crypto.subtle.encrypt(
        { name: "RSA-OAEP" },
        recipientPublicKey,
        rawAesKey
    );

    // 4. Package everything
    // Format: JSON string containing { key: base64, iv: base64, content: base64 }
    // This isn't the most efficient format but it's simple to verify.
    const packageData = {
        k: arrayBufferToBase64(encryptedKey),
        iv: arrayBufferToBase64(iv),
        c: arrayBufferToBase64(encryptedContent)
    };

    return JSON.stringify(packageData);
};

/**
 * Decrypt Data with Private Key
 */
export const decryptMessage = async (encryptedPackage: string, privateKey: CryptoKey): Promise<string> => {
    try {
        const pkg = JSON.parse(encryptedPackage);

        // 1. Decrypt AES Key
        const encryptedKey = base64ToArrayBuffer(pkg.k);
        const rawAesKey = await window.crypto.subtle.decrypt(
            { name: "RSA-OAEP" },
            privateKey,
            encryptedKey
        );

        // Import the AES key
        const aesKey = await window.crypto.subtle.importKey(
            'raw',
            rawAesKey,
            ENCRYPTION_ALGO,
            true,
            ['decrypt']
        );

        // 2. Decrypt Content
        const iv = base64ToArrayBuffer(pkg.iv);
        const encryptedContent = base64ToArrayBuffer(pkg.c);
        const decryptedContent = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv },
            aesKey,
            encryptedContent
        );

        return new TextDecoder().decode(decryptedContent);
    } catch (e) {
        console.error('Decryption failed:', e);
        return '[Encrypted Message]';
    }
};

/**
 * Derive Key from PIN (PBKDF2)
 */
const deriveKeyFromPin = async (pin: string, salt: Uint8Array): Promise<CryptoKey> => {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
        "raw",
        enc.encode(pin),
        "PBKDF2",
        false,
        ["deriveKey"]
    );

    return window.crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt,
            iterations: 100000,
            hash: "SHA-256"
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
    );
};

/**
 * Wrap Private Key with PIN (for recovery storage)
 */
export const wrapPrivateKey = async (privateKey: CryptoKey, pin: string): Promise<{ encryptedKey: string; salt: string; iv: string }> => {
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    // Derive wrapping key
    const wrappingKey = await deriveKeyFromPin(pin, salt);

    // Export private key to JWK first
    const jwk = await exportKey(privateKey);
    const jwkString = JSON.stringify(jwk);
    const encodedJwk = new TextEncoder().encode(jwkString);

    // Encrypt the JWK string directly (wrapping via encrypt isn't strictly wrapKey but easier for JWK text)
    // Actually wrapKey is better for CryptoKey objects, but let's stick to encrypting the exported JSON for simplicity and portability debugging.

    const encryptedData = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        wrappingKey,
        encodedJwk
    );

    return {
        encryptedKey: arrayBufferToBase64(encryptedData),
        salt: arrayBufferToBase64(salt),
        iv: arrayBufferToBase64(iv)
    };
};

/**
 * Unwrap Private Key with PIN
 */
export const unwrapPrivateKey = async (encryptedKeyBase64: string, saltBase64: string, ivBase64: string, pin: string): Promise<CryptoKey> => {
    const salt = base64ToArrayBuffer(saltBase64);
    const iv = base64ToArrayBuffer(ivBase64);
    const encryptedData = base64ToArrayBuffer(encryptedKeyBase64);

    const unwrappingKey = await deriveKeyFromPin(pin, new Uint8Array(salt));

    const decryptedData = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        unwrappingKey,
        encryptedData
    );

    const jwkString = new TextDecoder().decode(decryptedData);
    const jwk = JSON.parse(jwkString);

    return importPrivateKey(jwk);
};
