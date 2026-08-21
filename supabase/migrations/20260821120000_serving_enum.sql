-- Add serving status (must commit before any statement uses the new enum value).
alter type public.queue_status add value if not exists 'serving';
