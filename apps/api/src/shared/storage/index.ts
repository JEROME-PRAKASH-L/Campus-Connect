import { env } from '../../config/env.js';
import { localDriver } from './local.driver.js';
import { s3Driver } from './s3.driver.js';
import type { StorageDriver } from './storage.types.js';

export const storage: StorageDriver = env.storage.driver === 's3' ? s3Driver : localDriver;

export type { SignedUpload, StorageDriver } from './storage.types.js';
