import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';

/**
 * Utility class for encrypting and decrypting sensitive data
 */
export class EncryptionUtil {
  private static readonly ALGORITHM = 'aes-256-cbc';
  private static readonly IV_LENGTH = 16;

  /**
   * Get encryption key from environment
   */
  private static getEncryptionKey(): string {
    const key = process.env.ENCRYPTION_KEY;
    if (!key || key === 'change-this-to-a-secure-random-key') {
      throw new Error(
        'ENCRYPTION_KEY not set or using default value. Please set a secure encryption key in .env file',
      );
    }
    return key;
  }

  /**
   * Encrypt text using AES-256-CBC
   */
  static encrypt(text: string): string {
    try {
      const key = this.getEncryptionKey();
      const iv = crypto.randomBytes(this.IV_LENGTH);
      const cipher = crypto.createCipheriv(
        this.ALGORITHM,
        Buffer.from(key.substring(0, 32).padEnd(32, '0')),
        iv,
      );

      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Return IV + encrypted data as hex string
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt text using AES-256-CBC
   */
  static decrypt(encryptedText: string): string {
    try {
      const key = this.getEncryptionKey();
      const parts = encryptedText.split(':');
      if (parts.length !== 2) {
        throw new Error('Invalid encrypted text format');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];

      const decipher = crypto.createDecipheriv(
        this.ALGORITHM,
        Buffer.from(key.substring(0, 32).padEnd(32, '0')),
        iv,
      );

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Generate a secure random encryption key (for setup)
   */
  static generateKey(): string {
    return crypto.randomBytes(32).toString('base64');
  }
}

