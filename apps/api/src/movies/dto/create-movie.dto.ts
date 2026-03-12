import { IsString, IsOptional, IsArray, IsInt, MaxLength, IsUUID } from 'class-validator';

export class CreateMovieDto {
    @IsString()
    @MaxLength(500)
    title!: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsArray()
    @IsUUID('4', { each: true })
    genreIds?: string[];

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    actors?: string[];

    @IsOptional()
    @IsInt()
    releaseYear?: number;

    @IsOptional()
    @IsInt()
    durationSeconds?: number;

    @IsOptional()
    @IsString()
    posterUrl?: string;

    @IsOptional()
    @IsString()
    backdropUrl?: string;

    @IsOptional()
    @IsString()
    originalLanguage?: string;

    @IsOptional()
    @IsString()
    trailerUrl?: string;
}
