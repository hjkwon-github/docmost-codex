import { 
  ExceptionFilter, 
  Catch, 
  ArgumentsHost, 
  HttpException, 
  HttpStatus,
  Logger 
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class LlmExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(LlmExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let details: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const responseBody = exception.getResponse();
      message = typeof responseBody === 'string' 
        ? responseBody 
        : (responseBody as any)?.message || message;
    } else if (exception instanceof Error) {
      // Handle specific AI service errors
      if (exception.message.includes('API key')) {
        status = HttpStatus.UNAUTHORIZED;
        message = 'AI service authentication failed';
      } else if (exception.message.includes('rate limit') || exception.message.includes('429')) {
        status = HttpStatus.TOO_MANY_REQUESTS;
        message = 'AI service rate limit exceeded';
      } else if (exception.message.includes('timeout') || exception.message.includes('connect')) {
        status = HttpStatus.SERVICE_UNAVAILABLE;
        message = 'AI service is temporarily unavailable';
      } else if (exception.message.includes('model not found') || exception.message.includes('404')) {
        status = HttpStatus.NOT_FOUND;
        message = 'Requested AI model not found';
      } else {
        message = 'AI service error occurred';
        details = process.env.NODE_ENV === 'development' ? exception.message : undefined;
      }
      
      this.logger.error(
        `LLM Service Error: ${exception.message}`,
        exception.stack,
        'LlmExceptionFilter'
      );
    }

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      message,
      ...(details && { details }),
      ...(process.env.NODE_ENV === 'development' && { 
        stack: exception instanceof Error ? exception.stack : undefined 
      })
    };

    response.status(status).json(errorResponse);
  }
}
