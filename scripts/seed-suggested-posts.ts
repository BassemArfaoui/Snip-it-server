import { NestFactory } from '@nestjs/core';
import { SeedModule } from './seed/seed.module';
import { SeedService } from './seed/seed.service';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(SeedModule);
    const seedService = app.select(SeedModule).get(SeedService);

    try {
        await seedService.seedSuggestedPosts();
    } catch (error) {
        console.error('Seeding suggested posts failed:', error);
    } finally {
        await app.close();
    }
}

bootstrap();
