import type { IVector3Like } from '@babylonjs/core/Maths/math.like';
import { PerformanceMonitor } from '@babylonjs/core/Misc/performanceMonitor';
import { EventEmitter } from 'eventemitter3';
import { assignWithDefaults, pick, randomHex } from 'utilium';
import type { Component } from './component';
import { Player, type PlayerJSON } from './player';
import { logger } from './utils';
import { Entity, filterEntities, type EntityJSON } from './entity';

export interface MoveInfo<T> {
	id: string;
	target: T;
}

export interface LevelJSON {
	date: string;
	difficulty: number;
	name: string;
	id: string;
	entities: EntityJSON[];
}

const copy = ['difficulty', 'name', 'id'] as const satisfies ReadonlyArray<keyof Level>;

export interface LevelEvents {
	entity_added: [EntityJSON];
	entity_removed: [EntityJSON];
	entity_death: [EntityJSON];
	entity_path_start: [string, IVector3Like[]];
	player_reset: [PlayerJSON];
	update: [];
}

export const levelEventNames = ['entity_added', 'entity_removed', 'entity_death', 'entity_path_start', 'player_reset', 'update'] as const satisfies readonly (keyof LevelEvents)[];

export let loadingOrder: (typeof Entity)[] = [Player, Entity];

export function setLoadingOrder(order: (typeof Entity)[]) {
	loadingOrder = order;
}

export class Level extends EventEmitter<LevelEvents> implements Component<LevelJSON> {
	public id: string = randomHex(16);
	public name: string = '';
	public date = new Date();
	public difficulty = 1;
	public entities: Set<Entity> = new Set();
	private _performanceMonitor = new PerformanceMonitor(60);

	public getEntityByID<N extends Entity = Entity>(id: string): N {
		for (const entity of this.entities) {
			if (entity.id == id) return entity as N;
		}

		throw new ReferenceError('Entity does not exist');
	}

	public selectEntities(selector: string): Set<Entity> {
		return filterEntities(this.entities, selector);
	}

	public entity<T extends Entity = Entity>(selector: string): T {
		return [...this.selectEntities(selector)][0] as T;
	}

	// events and ticking
	public get tps(): number {
		return this._performanceMonitor.averageFPS;
	}

	public update() {
		this._performanceMonitor.sampleFrame();
		this.emit('update');

		for (const entity of this.entities) {
			entity.update();
		}
	}

	public toJSON(): LevelJSON {
		const entities: EntityJSON[] = [...this.entities].map(e => e.toJSON());
		const order = loadingOrder.map(entity => entity.name).toReversed();
		/**
		 * Note: Sorted to make sure entities are saved in the correct order
		 * This prevents `level.getEntityByID(...)` from returning null
		 * Which in turn prevents `.owner = .parent = this` from throwing an error
		 */
		entities.sort((a, b) => (order.indexOf(a.entityType) < order.indexOf(b.entityType) ? -1 : 1));

		return {
			...pick(this, copy),
			date: new Date().toJSON(),
			entities,
		};
	}

	public fromJSON(json: LevelJSON): void {
		assignWithDefaults(this as Level, pick(json, copy));
		this.date = new Date(json.date);

		logger.log(`Loading ${json.entities.length} entities`);
		const priorities = loadingOrder.map(type => type.name);
		json.entities.sort((a, b) => (priorities.indexOf(a.entityType) > priorities.indexOf(b.entityType) ? 1 : -1));
		for (const data of json.entities) {
			if (!priorities.includes(data.entityType)) {
				logger.debug(`Loading ${data.entityType} ${data.id} (skipped)`);
				continue;
			}

			logger.debug(`Loading ${data.entityType} ${data.id}`);
			loadingOrder[priorities.indexOf(data.entityType)].FromJSON(data, this);
		}
	}

	public static FromJSON(this: new () => Level, json: LevelJSON): Level {
		const level = new this();
		level.fromJSON(json);
		return level;
	}
}
