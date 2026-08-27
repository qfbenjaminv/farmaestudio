begin;

select plan(12);

select has_table('public', 'profiles', 'profiles exists');
select has_table('public', 'question_solutions', 'question_solutions exists');
select has_table('public', 'review_queue', 'review_queue exists');
select has_function('public', 'submit_answer', array['uuid', 'uuid', 'public.option_key'], 'submit_answer rpc exists');
select has_function('public', 'start_drug_quiz', array['uuid', 'integer'], 'start_drug_quiz rpc exists');

select policies_are(
  'public',
  'profiles',
  array['profiles_select_own', 'profiles_insert_own', 'profiles_update_own'],
  'profiles has owner policies'
);

select policies_are(
  'public',
  'question_solutions',
  array['question_solutions_admin_only'],
  'solutions are admin only'
);

select policies_are(
  'public',
  'answers',
  array['answers_owner'],
  'answers are owner scoped'
);

select policies_are(
  'public',
  'review_queue',
  array['review_queue_owner'],
  'review queue is owner scoped'
);

select isnt_empty(
  $$select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'submit_answer' and p.prosecdef$$,
  'submit_answer is a privileged RPC so solutions stay off direct student reads'
);

select isnt_empty(
  $$select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'question_solutions' and c.relrowsecurity$$,
  'question_solutions has RLS enabled'
);

select isnt_empty(
  $$select 1 from information_schema.table_privileges where table_schema = 'public' and table_name = 'modules' and grantee = 'authenticated' and privilege_type = 'SELECT'$$,
  'authenticated can read taxonomy'
);

select * from finish();

rollback;
