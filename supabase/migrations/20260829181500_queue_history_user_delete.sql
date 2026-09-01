-- POPIA: let users erase their own line history from Profile (was missing from init migration).
drop policy if exists "Users can delete own history" on public.queue_history;

create policy "Users can delete own history"
  on public.queue_history for delete
  using (auth.uid() = user_id);

grant delete on table public.queue_history to authenticated;
