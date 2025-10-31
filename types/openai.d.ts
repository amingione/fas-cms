declare module 'openai' {
  interface OpenAIConstructor {
    new (config: { apiKey: string }): OpenAIInstance;
  }

  interface OpenAIInstance {
    responses: {
      create(input: Record<string, unknown>): Promise<{ output_text?: string }>;
    };
  }

  const OpenAI: OpenAIConstructor;
  export default OpenAI;
}
