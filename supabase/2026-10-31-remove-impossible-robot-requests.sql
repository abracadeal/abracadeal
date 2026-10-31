-- Anthony: impossible requests disappear; done requests still await his visual validation.
begin;
create function private.delete_impossible_robot_request()
returns trigger language plpgsql security definer set search_path='' as $fn$
begin
 delete from public.robot_learning_requests where id=new.id and status in ('failed','cancelled');
 return null;
end $fn$;
revoke all on function private.delete_impossible_robot_request() from public,anon,authenticated;
create trigger delete_impossible_robot_request
 after insert or update of status on public.robot_learning_requests
 for each row when (new.status in ('failed','cancelled'))
 execute function private.delete_impossible_robot_request();
delete from public.robot_learning_requests where status='failed';
-- public.admin_confirm_robot_learning_visual is intentionally not replaced.
commit;
