import type { IVector3Like } from '@babylonjs/core/Maths/math.like';
import { Vector2, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Logger } from 'logzen';

export const logger = new Logger({ noGlobalConsole: true });

export function randomInCircle(dis = 1): Vector2 {
	const angle = Math.random() * Math.PI * 2;

	return new Vector2(Math.cos(angle), Math.sin(angle)).scaleInPlace(dis);
}

export function randomInSphere(dis = 1, y0?: boolean): Vector3 {
	const angle = Math.random() * Math.PI * 2,
		angle2 = Math.random() * Math.PI * 2;

	return new Vector3(dis * Math.cos(angle), y0 ? 0 : dis * Math.sin(angle) * Math.cos(angle2), dis * Math.sin(angle) * (y0 ? 1 : Math.sin(angle2)));
}

export function roundVector({ x, y, z }: IVector3Like) {
	return new Vector3(Math.round(x), Math.round(y), Math.round(z));
}

export function xpToLevel(xp: number) {
	return Math.sqrt(xp / 10);
}

export function levelToXp(level: number) {
	return 10 * level ** 2;
}
