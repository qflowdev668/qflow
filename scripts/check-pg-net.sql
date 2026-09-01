-- Run in Supabase SQL Editor, or via: npm run check:supabase
-- Checks whether the pg_net extension is installed (required for DB→HTTP push fan-out).

SELECT extname, extversion, extnamespace::regnamespace AS schema
FROM pg_extension
WHERE extname = 'pg_net';

-- Empty result = pg_net not available on this project/plan.
-- Fallback: deploy the push-dispatch Edge Function (no pg_net required):
--   npm run functions:deploy
-- Then configure a Database Webhook on queue_entries / notifications,
-- or poll: GET …/functions/v1/push-dispatch?mode=poll
