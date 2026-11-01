-- 01/11/2026 (Claude, demande d'Anthony) : l'administrateur peut modifier / supprimer profils, pages pros et avis.
-- Appliqué via migrations « admin_edit_everything » et « admin_review_edit_rpc ».
create policy admin_update_profiles on public.profiles for update using (public.is_admin()) with check (public.is_admin());
create policy admin_insert_showrooms on public.pro_showrooms for insert with check (public.is_admin());
create policy admin_update_showrooms on public.pro_showrooms for update using (public.is_admin()) with check (public.is_admin());
create policy admin_delete_showrooms on public.pro_showrooms for delete using (public.is_admin());
create policy admin_select_reviews on public.reviews for select using (public.is_admin());
create policy admin_update_reviews on public.reviews for update using (public.is_admin()) with check (public.is_admin());
create policy admin_delete_reviews on public.reviews for delete using (public.is_admin());
create policy admin_update_vacation_reviews on public.vacation_reviews for update using (public.is_admin()) with check (public.is_admin());
create policy admin_delete_vacation_reviews on public.vacation_reviews for delete using (public.is_admin());
create policy admin_pro_showroom_insert on storage.objects for insert with check (bucket_id='pro-showroom' and public.is_admin());
create policy admin_pro_showroom_update on storage.objects for update using (bucket_id='pro-showroom' and public.is_admin()) with check (bucket_id='pro-showroom' and public.is_admin());
create policy admin_pro_showroom_delete on storage.objects for delete using (bucket_id='pro-showroom' and public.is_admin());
-- Fonctions admin_review_edit(p_kind,p_id,p_comment,p_rating,p_reply) et admin_review_delete(p_kind,p_id) :
-- security definer, réservées à is_admin() ; p_kind = 'vacances' (vacation_reviews) ou autre (reviews).
