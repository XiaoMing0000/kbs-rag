import crypto from 'crypto';

export function hashSha256(str: string): string {
	return crypto.createHash('sha256').update(str).digest('hex');
}
