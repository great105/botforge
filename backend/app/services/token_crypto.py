import hashlib
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.config import settings


def _get_key() -> bytes:
    """Derive a 32-byte key from the config string."""
    raw = settings.ENCRYPTION_KEY.encode()
    if len(raw) == 32:
        return raw
    return hashlib.sha256(raw).digest()


def encrypt_token(token: str) -> bytes:
    """Encrypt bot token with AES-256-GCM. Returns nonce + ciphertext."""
    key = _get_key()
    nonce = os.urandom(12)
    aesgcm = AESGCM(key)
    ciphertext = aesgcm.encrypt(nonce, token.encode(), None)
    return nonce + ciphertext


def decrypt_token(encrypted: bytes) -> str:
    """Decrypt bot token from nonce + ciphertext."""
    key = _get_key()
    nonce = encrypted[:12]
    ciphertext = encrypted[12:]
    aesgcm = AESGCM(key)
    plaintext = aesgcm.decrypt(nonce, ciphertext, None)
    return plaintext.decode()


def hash_token(token: str) -> str:
    """SHA-256 hash of bot token, truncated to 32 hex chars for webhook URL."""
    return hashlib.sha256(token.encode()).hexdigest()[:32]
