import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';

/**
 * Guard to ensure that :id parameters don't contain slashes
 * This prevents route conflicts with nested routes like /connections/:id/schemas
 */
@Injectable()
export class IdParamGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const id = request.params?.id;

    if (id && id.includes('/')) {
      // If ID contains a slash, it's likely a nested route that should be handled elsewhere
      throw new BadRequestException(
        'Invalid connection ID format. Nested routes should use specific endpoints.',
      );
    }

    return true;
  }
}

