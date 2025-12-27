export { generateCaption, generateAllCaptions, buildCaptionSystemPrompt, buildCaptionUserPrompt } from './generator';
export type { CaptionGenerationParams } from './prompts';
export type { GeneratedCaption } from './generator';

// Structured Caption System v2
export {
  buildStructuredSystemPrompt,
  buildStructuredUserPrompt,
  getStructureTemplate,
  getToneInstructions,
  getCTAOptions,
  getPlatformNotes,
} from './structured-prompts';
export type { StructuredCaptionParams } from './structured-prompts';
