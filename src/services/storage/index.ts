import { IExecutionRepository } from './IExecutionRepository';
import { LocalStorageRepository } from './LocalStorageRepository';
import { SupabaseRepository } from './SupabaseRepository';
import { getSupabaseClient, isSupabaseConfigured } from '../../lib/supabase';

let repositoryInstance: IExecutionRepository | null = null;
let currentMode: 'supabase' | 'local_storage' = 'local_storage';

export function getRepository(): IExecutionRepository {
  if (!repositoryInstance) {
    const supabaseClient = getSupabaseClient();
    if (isSupabaseConfigured && supabaseClient) {
      repositoryInstance = new SupabaseRepository(supabaseClient);
      currentMode = 'supabase';
    } else {
      repositoryInstance = new LocalStorageRepository();
      currentMode = 'local_storage';
    }
  }
  return repositoryInstance;
}

export function getActiveStorageMode(): 'supabase' | 'local_storage' {
  return currentMode;
}

export * from './IExecutionRepository';
export * from './LocalStorageRepository';
export * from './SupabaseRepository';
