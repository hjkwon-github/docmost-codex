import { IsOptional, IsString, IsUrl } from 'class-validator';

export class LlmConfig {
  @IsOptional()
  @IsString()
  OPENAI_API_KEY?: string;

  @IsOptional()
  @IsUrl()
  OPENAI_API_BASE?: string;

  @IsOptional()
  @IsString()
  HUGGINGFACE_API_KEY?: string;

  @IsOptional()
  @IsUrl()
  HUGGINGFACE_API_BASE?: string;

  @IsOptional()
  @IsUrl()
  LOCAL_LLM_API_BASE?: string;

  @IsOptional()
  @IsString()
  LOCAL_LLM_MODEL?: string;
}

export const LLM_CONFIG_DEFAULTS = {
  OPENAI_API_BASE: 'https://api.openai.com/v1',
  LOCAL_LLM_MODEL: 'default',
};
