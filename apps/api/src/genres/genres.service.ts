/**
 * ===== GENRES SERVICE - LOGIC QUẢN LÝ THỂ LOẠI PHIM =====
 *
 * GenresService xử lý CRUD thể loại phim:
 *
 * - create()      → Tạo thể loại mới (admin)
 * - findAll()     → Danh sách thể loại (public, có đếm số phim)
 * - findById()    → Chi tiết thể loại kèm danh sách phim
 * - update()      → Cập nhật thể loại (admin)
 * - delete()      → Xóa thể loại (admin)
 *
 * Quan hệ dữ liệu:
 * - Genre ↔ Movie: Many-to-Many qua bảng trung gian MovieGenre
 * - Mỗi Genre có slug (URL-friendly: "hanh-dong", "kinh-di")
 * - Slug được tạo tự động từ tên thể loại
 */

import {
    Injectable,
    NotFoundException,
    ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GenresService {
    constructor(private prisma: PrismaService) { }

    /**
     * TẠO THỂ LOẠI MỚI (Admin only)
     *
     * Luồng xử lý:
     * 1. Tạo slug từ tên thể loại (VD: "Hành Động" → "hanh-dong")
     * 2. Kiểm tra trùng slug → 409 Conflict
     * 3. Tạo record trong DB
     */
    async create(data: { name: string; slug?: string }) {
        // Tạo slug: lowercase, thay khoảng trắng thành dấu gạch ngang, bỏ ký tự đặc biệt
        const slug = data.slug || this.createSlug(data.name);

        // Kiểm tra slug trùng lặp
        const existing = await this.prisma.genre.findUnique({ where: { slug } });
        if (existing) {
            throw new ConflictException({
                code: 'GENRE_SLUG_EXISTS',
                message: `Genre with slug "${slug}" already exists`,
            });
        }

        return this.prisma.genre.create({
            data: {
                name: data.name,
                slug,
            },
        });
    }

    /**
     * DANH SÁCH THỂ LOẠI (Public, có đếm số phim)
     *
     * Trả về tất cả thể loại kèm số lượng phim thuộc thể loại đó.
     * Sử dụng _count để đếm quan hệ many-to-many.
     * Sắp xếp theo tên (A → Z).
     */
    async findAll() {
        const genres = await this.prisma.genre.findMany({
            include: {
                _count: {
                    select: { movies: true }, // Đếm số phim thuộc thể loại
                },
            },
            orderBy: { name: 'asc' }, // Sắp xếp A → Z
        });

        return genres.map((g) => ({
            id: g.id,
            name: g.name,
            slug: g.slug,
            movieCount: g._count.movies, // Số phim thuộc thể loại
        }));
    }

    /**
     * CHI TIẾT THỂ LOẠI + DANH SÁCH PHIM
     *
     * Tìm thể loại theo ID, kèm danh sách phim thuộc thể loại đó.
     * → Sử dụng bảng trung gian MovieGenre → Movie
     */
    async findById(id: string) {
        const genre = await this.prisma.genre.findUnique({
            where: { id },
            include: {
                movies: {
                    include: {
                        movie: true, // Join qua bảng trung gian → lấy thông tin phim
                    },
                },
            },
        });

        if (!genre) {
            throw new NotFoundException({
                code: 'GENRE_NOT_FOUND',
                message: 'Genre not found',
            });
        }

        return {
            id: genre.id,
            name: genre.name,
            slug: genre.slug,
            // Map từ { movie: {...} }[] → [...]
            movies: genre.movies.map((mg) => ({
                id: mg.movie.id,
                title: mg.movie.title,
                posterUrl: mg.movie.posterUrl,
                releaseYear: mg.movie.releaseYear,
            })),
        };
    }

    /**
     * CẬP NHẬT THỂ LOẠI (Admin only)
     * Kiểm tra tồn tại → 404
     * Nếu đổi slug → kiểm tra trùng
     */
    async update(id: string, data: { name?: string; slug?: string }) {
        const existing = await this.prisma.genre.findUnique({ where: { id } });
        if (!existing) {
            throw new NotFoundException({
                code: 'GENRE_NOT_FOUND',
                message: 'Genre not found',
            });
        }

        // Nếu đổi slug → kiểm tra trùng (loại trừ chính nó)
        if (data.slug && data.slug !== existing.slug) {
            const duplicate = await this.prisma.genre.findFirst({
                where: { slug: data.slug, id: { not: id } },
            });
            if (duplicate) {
                throw new ConflictException({
                    code: 'GENRE_SLUG_EXISTS',
                    message: `Genre with slug "${data.slug}" already exists`,
                });
            }
        }

        return this.prisma.genre.update({
            where: { id },
            data: {
                ...(data.name && { name: data.name }),
                ...(data.slug && { slug: data.slug }),
            },
        });
    }

    /**
     * XÓA THỂ LOẠI (Admin only)
     * Xóa thể loại → cascade xóa các liên kết MovieGenre
     * (Phim vẫn tồn tại, chỉ bị mất liên kết với thể loại này)
     */
    async delete(id: string) {
        const existing = await this.prisma.genre.findUnique({ where: { id } });
        if (!existing) {
            throw new NotFoundException({
                code: 'GENRE_NOT_FOUND',
                message: 'Genre not found',
            });
        }

        await this.prisma.genre.delete({ where: { id } });
        return { success: true };
    }

    // ═══════════════════════════════════════════════
    // HELPER
    // ═══════════════════════════════════════════════

    /**
     * TẠO SLUG TỪ TÊN THỂ LOẠI
     *
     * VD: "Hành Động" → "hanh-dong"
     * VD: "Sci-Fi & Fantasy" → "sci-fi-fantasy"
     *
     * Quy trình:
     * 1. Chuyển thường (lowercase)
     * 2. Bỏ dấu tiếng Việt (normalize NFD + remove combining marks)
     * 3. Thay ký tự không phải chữ/số thành dấu gạch ngang
     * 4. Gộp nhiều gạch ngang liên tiếp
     * 5. Trim gạch ngang đầu/cuối
     */
    private createSlug(name: string): string {
        return name
            .toLowerCase()
            .normalize('NFD')                   // Tách dấu: "ă" → "a" + "̆"
            .replace(/[\u0300-\u036f]/g, '')     // Bỏ dấu combining
            .replace(/đ/g, 'd')                  // Đổi đ → d
            .replace(/[^a-z0-9]+/g, '-')         // Ký tự đặc biệt → "-"
            .replace(/-+/g, '-')                 // Gộp nhiều "-" thành 1
            .replace(/^-|-$/g, '');              // Trim "-" đầu/cuối
    }
}
