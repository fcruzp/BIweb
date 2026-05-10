#!/bin/bash
cd /home/z/my-project
export DATABASE_URL="postgresql://postgres.rsrcdaepiwjqfynwwzcn:GGu12qk8uCNsMSbW@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require&connect_timeout=15"
export DIRECT_URL="postgresql://postgres.rsrcdaepiwjqfynwwzcn:GGu12qk8uCNsMSbW@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require&connect_timeout=15"
exec node node_modules/.bin/next dev -p 3000
