import { type BVClient, getDefaultClient } from "../client";

export interface SourceConfig {
  client?: BVClient;
}

export abstract class Source {
  protected readonly client: BVClient;

  constructor(config?: SourceConfig) {
    this.client = config?.client ?? getDefaultClient();
  }

  abstract readonly name: string;
  abstract readonly baseUrl: string;
}
