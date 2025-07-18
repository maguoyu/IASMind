export interface ModelConfig {
  basic: string[];
  reasoning: string[];
}

export interface RagConfig {
  provider: string;
}

export interface IASMindConfig {
  rag: RagConfig;
  models: ModelConfig;
}
