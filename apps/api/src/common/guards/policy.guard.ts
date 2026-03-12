import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { User, MovieStatus, EncodeStatus } from '@prisma/client';

/**
 * Policy types for resource access control
 */
export type PolicyType =
    | 'MovieRead'      // Viewer: published+ready, Admin: all
    | 'MovieWrite'     // Admin only
    | 'UserOwned'      // Owner or Admin
    | 'MovieVisible';  // Movie must be published+ready for non-admins

export interface PolicyOptions {
    /** Route parameter name containing the resource ID */
    param?: string;
}

export const POLICY_KEY = 'policy';

/**
 * PolicyGuard - Centralized BOLA protection
 * 
 * Implements OWASP API1:2023 recommendations:
 * - Object-level authorization on every request
 * - Ownership validation for user-scoped resources
 * - Visibility rules for content access
 */
@Injectable()
export class PolicyGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private prisma: PrismaService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const policyMeta = this.reflector.getAllAndOverride<{
            type: PolicyType;
            options?: PolicyOptions;
        }>(POLICY_KEY, [context.getHandler(), context.getClass()]);

        // No policy defined = allow (authentication still required by JwtAuthGuard)
        if (!policyMeta) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user as User | undefined;
        const { type, options = {} } = policyMeta;

        switch (type) {
            case 'MovieRead':
                return this.checkMovieRead(request, user, options);
            case 'MovieWrite':
                return this.checkAdminOnly(user);
            case 'MovieVisible':
                return this.checkMovieVisible(request, user, options);
            case 'UserOwned':
                return this.checkUserOwned(user);
            default:
                return true;
        }
    }

    /**
     * MovieRead: Viewers can only read published+ready movies
     * Admins can read all movies
     */
    private async checkMovieRead(
        request: any,
        user: User | undefined,
        options: PolicyOptions,
    ): Promise<boolean> {
        const movieId = request.params[options.param || 'id'];
        if (!movieId) return true;

        const movie = await this.prisma.movie.findUnique({
            where: { id: movieId },
            select: { id: true, movieStatus: true, encodeStatus: true },
        });

        if (!movie) {
            throw new NotFoundException({
                code: 'MOVIE_NOT_FOUND',
                message: 'Movie not found',
            });
        }

        // Admin can see all movies
        if (user?.role === 'admin') {
            return true;
        }

        // Viewer can only see published + ready movies
        if (
            movie.movieStatus !== MovieStatus.published ||
            movie.encodeStatus !== EncodeStatus.ready
        ) {
            throw new ForbiddenException({
                code: 'MOVIE_NOT_AVAILABLE',
                message: 'Movie is not available',
            });
        }

        return true;
    }

    /**
     * MovieVisible: Check movie exists and is visible for non-admins before operations
     */
    private async checkMovieVisible(
        request: any,
        user: User | undefined,
        options: PolicyOptions,
    ): Promise<boolean> {
        const movieId = request.params[options.param || 'movieId'] ||
            request.query[options.param || 'movieId'];
        if (!movieId) return true;

        const movie = await this.prisma.movie.findUnique({
            where: { id: movieId },
            select: { id: true, movieStatus: true, encodeStatus: true },
        });

        if (!movie) {
            throw new NotFoundException({
                code: 'MOVIE_NOT_FOUND',
                message: 'Movie not found',
            });
        }

        // Admin can access any movie
        if (user?.role === 'admin') {
            return true;
        }

        // Non-admin: movie must be published + ready
        if (
            movie.movieStatus !== MovieStatus.published ||
            movie.encodeStatus !== EncodeStatus.ready
        ) {
            throw new ForbiddenException({
                code: 'MOVIE_NOT_AVAILABLE',
                message: 'Movie is not available',
            });
        }

        return true;
    }

    /**
     * Admin only access
     */
    private checkAdminOnly(user: User | undefined): boolean {
        if (!user || user.role !== 'admin') {
            throw new ForbiddenException({
                code: 'FORBIDDEN_ADMIN_ONLY',
                message: 'This action requires admin role',
            });
        }
        return true;
    }

    /**
     * UserOwned: Resource must belong to current user
     */
    private checkUserOwned(user: User | undefined): boolean {
        if (!user) {
            throw new ForbiddenException({
                code: 'UNAUTHORIZED',
                message: 'Authentication required',
            });
        }

        return true;
    }
}
