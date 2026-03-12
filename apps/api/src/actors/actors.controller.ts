import { Controller, Get, Query } from '@nestjs/common';
import { ActorsService } from './actors.service';

@Controller('actors')
export class ActorsController {
    constructor(private readonly actorsService: ActorsService) { }

    @Get('suggest')
    async suggest(@Query('q') q: string = '') {
        const names = await this.actorsService.suggest(q);
        return { data: names };
    }
}
