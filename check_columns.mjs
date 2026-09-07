import pg from 'pg';
const client = new pg.Client('postgres://postgres:cellexpress151524@db.qpxxzzvozrnfmjcygujv.supabase.co:5432/postgres');

async function checkEstoqueColumns() {
  await client.connect();
  const res = await client.query(`
    SELECT column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_name = 'estoque'
  `);
  console.log('Columns of public.estoque:', res.rows);
  await client.end();
}

checkEstoqueColumns();
