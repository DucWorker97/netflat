import { Controller, Get, Query } from '@nestjs/common';
import { ActorsService } from './actors.service';

@Controller('actors')
export class ActorsController {
    constructor(private readonly actorsService: ActorsService) {}

    @Get('suggest')
    async suggest(@Query('q') q = '', @Query('limit') limit?: string) {
        const parsedLimit = limit ? Number.parseInt(limit, 10) : 10;

        return {
            data: await this.actorsService.suggest(
                q,
                Number.isNaN(parsedLimit) ? 10 : parsedLimit,
            ),
        };
    }
}
