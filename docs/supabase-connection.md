# Supabase conexión rápida (proyecto didbxinquugseweufvpr)

**Project ref:** `didbxinquugseweufvpr`  
**Pooler URL:** `postgresql://postgres.didbxinquugseweufvpr:WvyxYxZa8fjkUxWq@aws-1-us-east-2.pooler.supabase.com:5432/postgres`

## CLI (recomendado)
1) En este repo, enlaza el proyecto:
```bash
SUPABASE_ACCESS_TOKEN=sbp_85dda89f3ec2df51be8ae481ec5234091ede6a88 \
supabase link --project-ref didbxinquugseweufvpr --password WvyxYxZa8fjkUxWq
```
2) Corre comandos, por ejemplo listar tablas:
```bash
supabase db pull --linked
```

## Node/psql directo
```bash
node -e "const {Client}=require('pg');(async()=>{const c=new Client({connectionString:'postgresql://postgres.didbxinquugseweufvpr:WvyxYxZa8fjkUxWq@aws-1-us-east-2.pooler.supabase.com:5432/postgres',ssl:{rejectUnauthorized:false}});await c.connect();console.log((await c.query(`select table_name from information_schema.tables where table_schema='public' order by table_name`)).rows);await c.end();})();"
```

> Nota: el pooler usa usuario `postgres.didbxinquugseweufvpr`. Mantén este archivo privado; contiene credenciales sensibles.***
