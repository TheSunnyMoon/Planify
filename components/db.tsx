import postgres from 'postgres';

async function getData() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not 1 defined');
  }
  const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });
  const response = await sql`SELECT * from USERS`;
  return response[0].id; 
}

export default async function dbConnect() {
  const data = await getData();
  return <>{data}</>;
}