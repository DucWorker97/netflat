'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateMovie } from '@/lib/queries';
import { useLocalePath } from '@/lib/use-locale-path';

const schema = z.object({
    title: z.string().min(1, 'Tiêu đề là bắt buộc').max(500),
    description: z.string().max(2000).optional(),
    releaseYear: z.number().int().min(1900).max(2100).optional().nullable(),
});

type FormData = z.infer<typeof schema>;

export default function NewMoviePage() {
    const t = useTranslations('Movies');
    const tCommon = useTranslations('Common');
    const router = useRouter();
    const { localePath } = useLocalePath();
    const createMutation = useCreateMovie();

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            title: '',
            description: '',
            releaseYear: new Date().getFullYear(),
        },
    });

    const descriptionValue = watch('description') || '';

    const onSubmit = async (data: FormData) => {
        try {
            const movie = await createMutation.mutateAsync({
                title: data.title,
                description: data.description || undefined,
                releaseYear: data.releaseYear || undefined,
            });
            router.push(localePath(`/movies/${movie.id}?tab=media`));
        } catch (err: any) {
            const msg = err?.response?.data?.message || err.message || tCommon('error');
            alert(msg);
        }
    };

    return (
        <div className="animate-fade-in" style={{ maxWidth: '40rem', margin: '0 auto', padding: '2rem 1rem' }}>
            {/* Breadcrumb */}
            <div className="breadcrumb">
                <button onClick={() => router.push(localePath('/movies'))} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0, font: 'inherit' }}>
                    Phim
                </button>
                <span className="separator">/</span>
                <span className="current">Mới</span>
            </div>

            {/* Form Card */}
            <div className="glass-card overflow-hidden">
                <div className="p-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <h1 className="gradient-text" style={{ fontSize: '1.5rem', fontWeight: 700 }}>Tạo phim mới</h1>
                    <p className="text-sm text-muted mt-1">Nhập thông tin cơ bản. Bạn có thể thêm thể loại, diễn viên và tải media ở bước tiếp theo.</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="p-6" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* Title */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label className="form-label" htmlFor="title">Tiêu đề <span className="text-error">*</span></label>
                        <input
                            id="title"
                            type="text"
                            className="form-input"
                            placeholder="VD: Inception"
                            autoFocus
                            {...register('title')}
                        />
                        {errors.title && <p className="text-xs text-error">{errors.title.message}</p>}
                    </div>

                    {/* Description */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label className="form-label" htmlFor="description">Mô tả</label>
                        <textarea
                            id="description"
                            className="form-input form-textarea"
                            rows={3}
                            placeholder="Nhập tóm tắt phim..."
                            {...register('description')}
                        />
                        <p className="text-xs text-muted-dim text-right">{descriptionValue.length}/2000</p>
                    </div>

                    {/* Release Year */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '180px' }}>
                        <label className="form-label" htmlFor="releaseYear">Năm phát hành</label>
                        <input
                            id="releaseYear"
                            type="number"
                            className="form-input"
                            placeholder="2024"
                            {...register('releaseYear', { valueAsNumber: true })}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between gap-3" style={{ paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <button
                            type="button"
                            className="btn btn-ghost"
                            style={{ borderRadius: '8px' }}
                            onClick={() => router.push(localePath('/movies'))}
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            className="gradient-btn"
                            style={{ padding: '10px 24px', borderRadius: '10px', fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '8px' }}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <><span className="spinner spinner-sm" style={{ borderTopColor: '#fff' }}></span> Đang tạo...</>
                            ) : (
                                'Tạo và tiếp tục'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
