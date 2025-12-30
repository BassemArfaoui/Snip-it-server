import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

async function dropTagTables() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_host,
    port: Number(process.env.DB_port),
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD || '',
    database: process.env.POSTGRES_DB,
  });

  try {
    await dataSource.initialize();
    console.log('Connected to database');

    await dataSource.query('DROP TABLE IF EXISTS collection_tags CASCADE');
    console.log('Dropped collection_tags table');

    await dataSource.query('DROP TABLE IF EXISTS snippet_tags CASCADE');
    console.log('Dropped snippet_tags table');

    console.log('Successfully dropped old tag junction tables');
    console.log('TypeORM will recreate them with the correct structure on next startup');
  } catch (error) {
    console.error('Error dropping tables:', error);
  } finally {
    await dataSource.destroy();
  }
}

dropTagTables();
