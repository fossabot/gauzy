// Code from https://github.com/xmlking/ngx-starter-kit. 
// MIT License, see https://github.com/xmlking/ngx-starter-kit/blob/develop/LICENSE
// Copyright (c) 2018 Sumanth Chinthagunta

import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  DeepPartial,
  DeleteResult,
  FindConditions,
  FindManyOptions,
  FindOneOptions,
  Repository,
  UpdateResult,
} from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { mergeMap } from 'rxjs/operators';
import { of, throwError } from 'rxjs';
import { Base } from '../entities/base';
import { ICrudService } from './icrud.service';
import { IPagination } from './pagination';

export abstract class CrudService<T extends Base> implements ICrudService<T> {
  protected constructor(protected readonly repository: Repository<T>) {}

  public async findAll(filter?: FindManyOptions<T>): Promise<IPagination<T>> {
    const total = await this.repository.count(filter);
    const items = await this.repository.find(filter);
    return { items, total };
  }

  public async findOne(
    id: string | number | FindOneOptions<T> | FindConditions<T>,
    options?: FindOneOptions<T>,
  ): Promise<T> {
    const record = await this.repository.findOne(id as any, options);
    if (!record) {
      throw new NotFoundException(`The requested record was not found`);
    }
    return record;
  }

  public async create(entity: DeepPartial<T>, ...options: any[]): Promise<T> {
    const obj = this.repository.create(entity);
    try {
      // https://github.com/Microsoft/TypeScript/issues/21592
      return await this.repository.save(obj as any);
    } catch (err /*: WriteError*/) {
      throw new BadRequestException(err);
    }
  }

  public async update(
    id: string | number | FindConditions<T>,
    partialEntity: QueryDeepPartialEntity<T>,
    ...options: any[]
  ): Promise<UpdateResult | T> {
    try {
      return await this.repository.update(id, partialEntity);
    } catch (err /*: WriteError*/) {
      throw new BadRequestException(err);
    }
  }

  public async delete(criteria: string | number | FindConditions<T>, ...options: any[]): Promise<DeleteResult> {
    try {
      return this.repository.delete(criteria);
    } catch (err) {
      throw new NotFoundException(`The record was not found`, err);
    }
  }

  /**
   * e.g., findOneById(id).pipe(map(entity => entity.id), entityNotFound())
   */
  private entityNotFound() {
    return stream$ =>
      stream$.pipe(
        mergeMap(signal => {
          if (!signal) {
            return throwError(new NotFoundException(`The requested record was not found`));
          }
          return of(signal);
        }),
      );
  }
}
