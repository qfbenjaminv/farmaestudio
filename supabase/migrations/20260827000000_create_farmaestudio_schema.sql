create extension if not exists pgcrypto;

create schema if not exists app_private;

create type public.content_status as enum ('draft', 'published', 'archived');
create type public.question_difficulty as enum ('basica', 'intermedia', 'avanzada');
create type public.option_key as enum ('A', 'B', 'C', 'D');
create type public.quiz_kind as enum ('module', 'topic', 'drug', 'review');
create type public.quiz_status as enum ('active', 'completed', 'cancelled');
create type public.review_status as enum ('pending', 'resolved');
create type public.import_kind as enum ('references', 'questions');

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null,
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.modules (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^M[0-9]{2}$'),
  name text not null,
  description text not null default '',
  sort_order integer not null unique check (sort_order > 0)
);

create table public.topics (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  code text not null unique,
  name text not null,
  sort_order integer not null check (sort_order > 0),
  unique (module_id, sort_order)
);

create table public.drugs (
  id uuid primary key default gen_random_uuid(),
  drug_code text not null unique,
  generic_name text not null,
  created_at timestamptz not null default now()
);

create table public.topic_drugs (
  topic_id uuid not null references public.topics(id) on delete cascade,
  drug_id uuid not null references public.drugs(id) on delete cascade,
  primary key (topic_id, drug_id)
);

create table public.reference_entries (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null unique,
  module_id uuid not null references public.modules(id),
  topic_id uuid references public.topics(id),
  drug_id uuid references public.drugs(id),
  title text not null,
  summary text not null,
  mechanism text,
  uses text,
  adverse_effects text,
  contraindications text,
  interactions text,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reference_sources (
  id uuid primary key default gen_random_uuid(),
  reference_entry_id uuid not null references public.reference_entries(id) on delete cascade,
  title text not null,
  authors text,
  publication_year integer,
  url text,
  locator text
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  question_code text not null unique,
  module_id uuid not null references public.modules(id),
  topic_id uuid not null references public.topics(id),
  difficulty public.question_difficulty not null,
  created_at timestamptz not null default now()
);

create table public.question_versions (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  status public.content_status not null default 'draft',
  prompt text not null,
  feedback text not null,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  unique (question_id, version_number)
);

create table public.question_options (
  id uuid primary key default gen_random_uuid(),
  question_version_id uuid not null references public.question_versions(id) on delete cascade,
  option_key public.option_key not null,
  option_text text not null,
  unique (question_version_id, option_key)
);

create table public.question_solutions (
  question_version_id uuid primary key references public.question_versions(id) on delete cascade,
  correct_option public.option_key not null,
  explanation text not null
);

create table public.question_references (
  question_id uuid not null references public.questions(id) on delete cascade,
  reference_entry_id uuid not null references public.reference_entries(id) on delete restrict,
  primary key (question_id, reference_entry_id)
);

create table public.question_drugs (
  question_id uuid not null references public.questions(id) on delete cascade,
  drug_id uuid not null references public.drugs(id) on delete restrict,
  primary key (question_id, drug_id)
);

create table public.study_cycles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cycle_number integer not null check (cycle_number > 0),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (user_id, cycle_number)
);

create table public.quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cycle_id uuid not null references public.study_cycles(id) on delete cascade,
  kind public.quiz_kind not null,
  status public.quiz_status not null default 'active',
  requested_count integer not null check (requested_count > 0),
  actual_count integer not null check (actual_count >= 0),
  current_index integer not null default 0 check (current_index >= 0),
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.quiz_session_scopes (
  session_id uuid primary key references public.quiz_sessions(id) on delete cascade,
  module_id uuid references public.modules(id),
  topic_id uuid references public.topics(id),
  drug_id uuid references public.drugs(id),
  check (
    (module_id is not null)::integer +
    (topic_id is not null)::integer +
    (drug_id is not null)::integer <= 1
  )
);

create table public.session_items (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.quiz_sessions(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete restrict,
  question_version_id uuid not null references public.question_versions(id) on delete restrict,
  item_index integer not null check (item_index >= 0),
  answered_at timestamptz,
  unique (session_id, item_index),
  unique (session_id, question_id)
);

create table public.answers (
  id uuid primary key default gen_random_uuid(),
  session_item_id uuid not null unique references public.session_items(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete restrict,
  question_version_id uuid not null references public.question_versions(id) on delete restrict,
  selected_option public.option_key not null,
  is_correct boolean not null,
  is_review boolean not null,
  answered_at timestamptz not null default now()
);

create table public.question_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  cycle_id uuid not null references public.study_cycles(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete restrict,
  first_answer_id uuid not null references public.answers(id) on delete restrict,
  seen_at timestamptz not null default now(),
  primary key (user_id, cycle_id, question_id)
);

create table public.review_queue (
  user_id uuid not null references auth.users(id) on delete cascade,
  cycle_id uuid not null references public.study_cycles(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete restrict,
  status public.review_status not null default 'pending',
  last_missed_at timestamptz not null default now(),
  resolved_at timestamptz,
  primary key (user_id, cycle_id, question_id)
);

create table public.import_batches (
  id uuid primary key default gen_random_uuid(),
  imported_by uuid not null references auth.users(id),
  kind public.import_kind not null,
  status public.content_status not null default 'draft',
  row_count integer not null default 0 check (row_count >= 0),
  created_at timestamptz not null default now()
);

create table public.import_errors (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.import_batches(id) on delete cascade,
  row_number integer not null check (row_number > 0),
  field_name text,
  message text not null
);

create index topics_module_id_idx on public.topics (module_id);
create index topic_drugs_drug_id_idx on public.topic_drugs (drug_id);
create index reference_entries_module_id_idx on public.reference_entries (module_id);
create index reference_entries_topic_id_idx on public.reference_entries (topic_id);
create index reference_entries_drug_id_idx on public.reference_entries (drug_id);
create index question_versions_question_status_idx on public.question_versions (question_id, status);
create index question_options_version_idx on public.question_options (question_version_id);
create index question_references_reference_idx on public.question_references (reference_entry_id);
create index question_drugs_drug_idx on public.question_drugs (drug_id);
create index study_cycles_user_open_idx on public.study_cycles (user_id) where completed_at is null;
create index quiz_sessions_user_status_idx on public.quiz_sessions (user_id, status);
create index session_items_session_idx on public.session_items (session_id, item_index);
create index answers_user_question_idx on public.answers (user_id, question_id);
create index review_queue_pending_idx on public.review_queue (user_id, cycle_id, last_missed_at desc) where status = 'pending';

create or replace function app_private.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin';
$$;

create or replace function app_private.current_user_id()
returns uuid
language plpgsql
stable
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'authentication required';
  end if;
  return uid;
end;
$$;

create or replace function app_private.ensure_active_cycle(p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_cycle_id uuid;
  v_next_number integer;
begin
  select id into v_cycle_id
  from public.study_cycles
  where user_id = p_user_id and completed_at is null
  order by cycle_number desc
  limit 1;

  if v_cycle_id is not null then
    return v_cycle_id;
  end if;

  select coalesce(max(cycle_number), 0) + 1 into v_next_number
  from public.study_cycles
  where user_id = p_user_id;

  insert into public.study_cycles (user_id, cycle_number)
  values (p_user_id, v_next_number)
  returning id into v_cycle_id;

  return v_cycle_id;
end;
$$;

create or replace function app_private.start_quiz_session(
  p_kind public.quiz_kind,
  p_requested_count integer,
  p_module_id uuid default null,
  p_topic_id uuid default null,
  p_drug_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_user_id uuid := app_private.current_user_id();
  v_cycle_id uuid := app_private.ensure_active_cycle(v_user_id);
  v_session_id uuid;
  v_question_ids uuid[];
  v_version_ids uuid[];
  v_actual_count integer;
begin
  if p_kind = 'drug' and p_requested_count not in (5, 10, 15, 20) then
    raise exception 'invalid drug quiz length';
  end if;

  if p_kind <> 'review' and exists (
    select 1 from public.quiz_sessions
    where user_id = v_user_id and status = 'active' and kind <> 'review'
  ) then
    raise exception 'active normal session exists';
  end if;

  with candidates as (
    select q.id as question_id, qv.id as version_id
    from public.questions q
    join public.question_versions qv on qv.question_id = q.id and qv.status = 'published'
    left join public.question_progress qp
      on qp.user_id = v_user_id
     and qp.cycle_id = v_cycle_id
     and qp.question_id = q.id
    where qp.question_id is null
      and (p_module_id is null or q.module_id = p_module_id)
      and (p_topic_id is null or q.topic_id = p_topic_id)
      and (
        p_drug_id is null
        or exists (
          select 1 from public.question_drugs qd
          where qd.question_id = q.id and qd.drug_id = p_drug_id
        )
      )
    order by random()
    limit p_requested_count
  )
  select coalesce(array_agg(question_id), '{}'), coalesce(array_agg(version_id), '{}')
  into v_question_ids, v_version_ids
  from candidates;

  v_actual_count := cardinality(v_question_ids);
  if v_actual_count = 0 then
    raise exception 'no unseen questions remain';
  end if;

  insert into public.quiz_sessions (user_id, cycle_id, kind, requested_count, actual_count)
  values (v_user_id, v_cycle_id, p_kind, p_requested_count, v_actual_count)
  returning id into v_session_id;

  insert into public.quiz_session_scopes (session_id, module_id, topic_id, drug_id)
  values (v_session_id, p_module_id, p_topic_id, p_drug_id);

  insert into public.session_items (session_id, question_id, question_version_id, item_index)
  select v_session_id, v_question_ids[i], v_version_ids[i], i - 1
  from generate_subscripts(v_question_ids, 1) as i;

  return (
    select jsonb_build_object(
      'id', s.id,
      'user_id', s.user_id,
      'kind', s.kind,
      'requested_length', s.requested_count,
      'actual_length', s.actual_count,
      'shortened', s.actual_count < s.requested_count,
      'module_id', sc.module_id,
      'topic_id', sc.topic_id,
      'drug_id', sc.drug_id,
      'question_ids', to_jsonb(v_question_ids),
      'current_index', s.current_index,
      'cycle_id', s.cycle_id,
      'started_at', s.started_at,
      'completed_at', s.completed_at
    )
    from public.quiz_sessions s
    join public.quiz_session_scopes sc on sc.session_id = s.id
    where s.id = v_session_id
  );
end;
$$;

create or replace function public.start_module_quiz(module_id uuid)
returns jsonb
language sql
security definer
set search_path = public, app_private
as $$
  select app_private.start_quiz_session('module', 20, module_id, null, null);
$$;

create or replace function public.start_topic_quiz(topic_id uuid)
returns jsonb
language sql
security definer
set search_path = public, app_private
as $$
  select app_private.start_quiz_session('topic', 20, null, topic_id, null);
$$;

create or replace function public.start_drug_quiz(drug_id uuid, requested_count integer)
returns jsonb
language sql
security definer
set search_path = public, app_private
as $$
  select app_private.start_quiz_session('drug', requested_count, null, null, drug_id);
$$;

create or replace function public.create_review_session(requested_count integer default 20)
returns jsonb
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_user_id uuid := app_private.current_user_id();
  v_cycle_id uuid := app_private.ensure_active_cycle(v_user_id);
  v_session_id uuid;
  v_question_ids uuid[];
  v_version_ids uuid[];
  v_actual_count integer;
begin
  with pending as (
    select rq.question_id, qv.id as version_id
    from public.review_queue rq
    join public.question_versions qv on qv.question_id = rq.question_id and qv.status = 'published'
    where rq.user_id = v_user_id and rq.cycle_id = v_cycle_id and rq.status = 'pending'
    order by rq.last_missed_at desc
    limit least(requested_count, 20)
  )
  select coalesce(array_agg(question_id), '{}'), coalesce(array_agg(version_id), '{}')
  into v_question_ids, v_version_ids
  from pending;

  v_actual_count := cardinality(v_question_ids);
  if v_actual_count = 0 then
    raise exception 'no review questions pending';
  end if;

  insert into public.quiz_sessions (user_id, cycle_id, kind, requested_count, actual_count)
  values (v_user_id, v_cycle_id, 'review', least(requested_count, 20), v_actual_count)
  returning id into v_session_id;

  insert into public.quiz_session_scopes (session_id) values (v_session_id);

  insert into public.session_items (session_id, question_id, question_version_id, item_index)
  select v_session_id, v_question_ids[i], v_version_ids[i], i - 1
  from generate_subscripts(v_question_ids, 1) as i;

  return (
    select jsonb_build_object(
      'id', s.id,
      'user_id', s.user_id,
      'kind', s.kind,
      'requested_length', s.requested_count,
      'actual_length', s.actual_count,
      'shortened', s.actual_count < s.requested_count,
      'module_id', null,
      'topic_id', null,
      'drug_id', null,
      'question_ids', to_jsonb(v_question_ids),
      'current_index', s.current_index,
      'cycle_id', s.cycle_id,
      'started_at', s.started_at,
      'completed_at', s.completed_at
    )
    from public.quiz_sessions s
    where s.id = v_session_id
  );
end;
$$;

create or replace function public.resume_active_session()
returns jsonb
language sql
security definer
set search_path = public, app_private
as $$
  select jsonb_build_object(
    'id', s.id,
    'user_id', s.user_id,
    'kind', s.kind,
    'requested_length', s.requested_count,
    'actual_length', s.actual_count,
    'shortened', s.actual_count < s.requested_count,
    'module_id', sc.module_id,
    'topic_id', sc.topic_id,
    'drug_id', sc.drug_id,
    'question_ids', (select jsonb_agg(si.question_id order by si.item_index) from public.session_items si where si.session_id = s.id),
    'current_index', s.current_index,
    'cycle_id', s.cycle_id,
    'started_at', s.started_at,
    'completed_at', s.completed_at
  )
  from public.quiz_sessions s
  join public.quiz_session_scopes sc on sc.session_id = s.id
  where s.user_id = app_private.current_user_id()
    and s.status = 'active'
    and s.kind <> 'review'
  order by s.started_at desc
  limit 1;
$$;

create or replace function public.get_current_profile()
returns jsonb
language sql
security definer
set search_path = public, app_private
as $$
  select jsonb_build_object(
    'id', p.user_id,
    'role', case when app_private.is_admin() then 'admin' else 'student' end,
    'displayName', p.display_name
  )
  from public.profiles p
  where p.user_id = app_private.current_user_id();
$$;

create or replace function public.list_modules()
returns jsonb
language sql
security definer
set search_path = public, app_private
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id,
    'code', code,
    'name', name,
    'description', description,
    'sortOrder', sort_order
  ) order by sort_order), '[]'::jsonb)
  from public.modules;
$$;

create or replace function public.list_topics(module_id uuid)
returns jsonb
language sql
security definer
set search_path = public, app_private
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', t.id,
    'moduleId', t.module_id,
    'name', t.name,
    'sortOrder', t.sort_order
  ) order by t.sort_order), '[]'::jsonb)
  from public.topics t
  where t.module_id = list_topics.module_id;
$$;

create or replace function public.list_drugs()
returns jsonb
language sql
security definer
set search_path = public, app_private
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', d.id,
    'genericName', d.generic_name,
    'moduleIds', coalesce(rel.module_ids, '[]'::jsonb),
    'topicIds', coalesce(rel.topic_ids, '[]'::jsonb)
  ) order by d.generic_name), '[]'::jsonb)
  from public.drugs d
  left join lateral (
    select jsonb_agg(distinct t.module_id) as module_ids,
           jsonb_agg(distinct td.topic_id) as topic_ids
    from public.topic_drugs td
    join public.topics t on t.id = td.topic_id
    where td.drug_id = d.id
  ) rel on true;
$$;

create or replace function public.search_references(search_query text default '')
returns jsonb
language sql
security definer
set search_path = public, app_private
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', re.id,
    'title', re.title,
    'moduleId', re.module_id,
    'drugIds', case when re.drug_id is null then '[]'::jsonb else jsonb_build_array(re.drug_id) end,
    'summary', re.summary,
    'tags', '[]'::jsonb
  ) order by re.title), '[]'::jsonb)
  from public.reference_entries re
  where re.status = 'published'
    and (
      coalesce(search_query, '') = ''
      or to_tsvector('spanish', re.title || ' ' || re.summary) @@ plainto_tsquery('spanish', search_query)
      or re.title ilike '%' || search_query || '%'
    );
$$;

create or replace function public.get_reference(reference_id uuid)
returns jsonb
language sql
security definer
set search_path = public, app_private
as $$
  select jsonb_build_object(
    'id', re.id,
    'title', re.title,
    'moduleId', re.module_id,
    'drugIds', case when re.drug_id is null then '[]'::jsonb else jsonb_build_array(re.drug_id) end,
    'summary', re.summary,
    'tags', '[]'::jsonb
  )
  from public.reference_entries re
  where re.id = get_reference.reference_id
    and (re.status = 'published' or app_private.is_admin());
$$;

create or replace function public.get_session_question(session_id uuid, item_index integer)
returns jsonb
language sql
security definer
set search_path = public, app_private
as $$
  select jsonb_build_object(
    'id', q.id,
    'questionCode', q.question_code,
    'version', qv.version_number,
    'stem', qv.prompt,
    'choices', (
      select jsonb_agg(jsonb_build_object('letter', qo.option_key, 'text', qo.option_text) order by qo.option_key)
      from public.question_options qo
      where qo.question_version_id = qv.id
    ),
    'moduleId', q.module_id,
    'topicId', q.topic_id,
    'drugIds', coalesce((select jsonb_agg(qd.drug_id) from public.question_drugs qd where qd.question_id = q.id), '[]'::jsonb),
    'status', qv.status
  )
  from public.quiz_sessions s
  join public.session_items si on si.session_id = s.id
  join public.questions q on q.id = si.question_id
  join public.question_versions qv on qv.id = si.question_version_id
  where s.user_id = app_private.current_user_id()
    and s.id = get_session_question.session_id
    and si.item_index = get_session_question.item_index;
$$;

create or replace function public.submit_answer(session_id uuid, question_id uuid, selected_option public.option_key)
returns jsonb
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_user_id uuid := app_private.current_user_id();
  v_session public.quiz_sessions%rowtype;
  v_item public.session_items%rowtype;
  v_solution public.question_solutions%rowtype;
  v_answer_id uuid;
  v_correct boolean;
  v_answer_count integer;
begin
  select * into v_session
  from public.quiz_sessions
  where id = submit_answer.session_id and user_id = v_user_id
  for update;

  if not found then
    raise exception 'session not found';
  end if;

  select * into v_item
  from public.session_items
  where session_id = v_session.id and question_id = submit_answer.question_id
  for update;

  if not found then
    raise exception 'question not found in session';
  end if;

  if exists (select 1 from public.answers where session_item_id = v_item.id) then
    raise exception 'answer already locked';
  end if;

  select * into v_solution
  from public.question_solutions
  where question_version_id = v_item.question_version_id;

  v_correct := v_solution.correct_option = selected_option;

  insert into public.answers (
    session_item_id,
    user_id,
    question_id,
    question_version_id,
    selected_option,
    is_correct,
    is_review
  )
  values (
    v_item.id,
    v_user_id,
    v_item.question_id,
    v_item.question_version_id,
    selected_option,
    v_correct,
    v_session.kind = 'review'
  )
  returning id into v_answer_id;

  update public.session_items
  set answered_at = now()
  where id = v_item.id;

  if v_session.kind = 'review' then
    if v_correct then
      update public.review_queue
      set status = 'resolved', resolved_at = now()
      where user_id = v_user_id and cycle_id = v_session.cycle_id and question_id = v_item.question_id;
    else
      update public.review_queue
      set status = 'pending', last_missed_at = now(), resolved_at = null
      where user_id = v_user_id and cycle_id = v_session.cycle_id and question_id = v_item.question_id;
    end if;
  else
    insert into public.question_progress (user_id, cycle_id, question_id, first_answer_id)
    values (v_user_id, v_session.cycle_id, v_item.question_id, v_answer_id)
    on conflict do nothing;

    if not v_correct then
      insert into public.review_queue (user_id, cycle_id, question_id, status, last_missed_at, resolved_at)
      values (v_user_id, v_session.cycle_id, v_item.question_id, 'pending', now(), null)
      on conflict (user_id, cycle_id, question_id)
      do update set status = 'pending', last_missed_at = excluded.last_missed_at, resolved_at = null;
    end if;
  end if;

  select count(*) into v_answer_count
  from public.session_items si
  join public.answers a on a.session_item_id = si.id
  where si.session_id = v_session.id;

  update public.quiz_sessions
  set current_index = v_answer_count,
      status = case when v_answer_count >= actual_count then 'completed' else status end,
      completed_at = case when v_answer_count >= actual_count then now() else completed_at end
  where id = v_session.id;

  return jsonb_build_object(
    'locked', true,
    'correct', v_correct,
    'solution', jsonb_build_object(
      'question_id', v_item.question_id,
      'correct_letter', v_solution.correct_option,
      'explanation', v_solution.explanation
    )
  );
end;
$$;

create or replace function public.start_new_cycle()
returns jsonb
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  v_user_id uuid := app_private.current_user_id();
  v_cycle_id uuid := app_private.ensure_active_cycle(v_user_id);
  v_missing_count integer;
  v_pending_count integer;
  v_next_number integer;
  v_new_cycle_id uuid;
begin
  select count(*) into v_missing_count
  from public.questions q
  join public.question_versions qv on qv.question_id = q.id and qv.status = 'published'
  where not exists (
    select 1 from public.question_progress qp
    where qp.user_id = v_user_id and qp.cycle_id = v_cycle_id and qp.question_id = q.id
  );

  select count(*) into v_pending_count
  from public.review_queue
  where user_id = v_user_id and cycle_id = v_cycle_id and status = 'pending';

  if v_missing_count > 0 or v_pending_count > 0 then
    raise exception 'cycle incomplete';
  end if;

  update public.study_cycles
  set completed_at = now()
  where id = v_cycle_id;

  select coalesce(max(cycle_number), 0) + 1 into v_next_number
  from public.study_cycles
  where user_id = v_user_id;

  insert into public.study_cycles (user_id, cycle_number)
  values (v_user_id, v_next_number)
  returning id into v_new_cycle_id;

  return jsonb_build_object('id', v_new_cycle_id);
end;
$$;

create or replace function public.list_review_queue()
returns jsonb
language sql
security definer
set search_path = public, app_private
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'questionId', q.id,
    'questionCode', q.question_code,
    'addedAt', rq.last_missed_at
  ) order by rq.last_missed_at desc), '[]'::jsonb)
  from public.review_queue rq
  join public.questions q on q.id = rq.question_id
  where rq.user_id = app_private.current_user_id()
    and rq.status = 'pending';
$$;

create or replace function public.get_progress_summary()
returns jsonb
language sql
security definer
set search_path = public, app_private
as $$
  with current_cycle as (
    select app_private.ensure_active_cycle(app_private.current_user_id()) as id
  ),
  first_answers as (
    select a.*
    from public.answers a
    join current_cycle c on true
    join public.question_progress qp on qp.first_answer_id = a.id and qp.cycle_id = c.id
    where a.user_id = app_private.current_user_id() and not a.is_review
  )
  select jsonb_build_object(
    'timezone', 'America/Santiago',
    'reviewQueueSize', (
      select count(*) from public.review_queue
      where user_id = app_private.current_user_id() and status = 'pending'
    ),
    'modules', coalesce(jsonb_agg(jsonb_build_object(
      'moduleId', m.id,
      'answered', coalesce(stats.answered, 0),
      'correctFirstAttempt', coalesce(stats.correct_first_attempt, 0),
      'accuracy', case when coalesce(stats.answered, 0) = 0 then 0 else stats.correct_first_attempt::numeric / stats.answered end,
      'remainingInCycle', coalesce(remaining.remaining, 0)
    ) order by m.sort_order), '[]'::jsonb)
  )
  from public.modules m
  left join lateral (
    select count(*) as answered, count(*) filter (where fa.is_correct) as correct_first_attempt
    from first_answers fa
    join public.questions q on q.id = fa.question_id
    where q.module_id = m.id
  ) stats on true
  left join lateral (
    select count(*) as remaining
    from public.questions q
    join public.question_versions qv on qv.question_id = q.id and qv.status = 'published'
    join current_cycle c on true
    where q.module_id = m.id
      and not exists (
        select 1 from public.question_progress qp
        where qp.user_id = app_private.current_user_id()
          and qp.cycle_id = c.id
          and qp.question_id = q.id
      )
  ) remaining on true;
$$;

alter table public.profiles enable row level security;
alter table public.modules enable row level security;
alter table public.topics enable row level security;
alter table public.drugs enable row level security;
alter table public.topic_drugs enable row level security;
alter table public.reference_entries enable row level security;
alter table public.reference_sources enable row level security;
alter table public.questions enable row level security;
alter table public.question_versions enable row level security;
alter table public.question_options enable row level security;
alter table public.question_solutions enable row level security;
alter table public.question_references enable row level security;
alter table public.question_drugs enable row level security;
alter table public.study_cycles enable row level security;
alter table public.quiz_sessions enable row level security;
alter table public.quiz_session_scopes enable row level security;
alter table public.session_items enable row level security;
alter table public.answers enable row level security;
alter table public.question_progress enable row level security;
alter table public.review_queue enable row level security;
alter table public.import_batches enable row level security;
alter table public.import_errors enable row level security;

revoke all on all tables in schema public from anon, authenticated;
grant usage on schema public to authenticated;
grant select on public.modules, public.topics, public.drugs, public.topic_drugs to authenticated;
grant select on public.reference_entries, public.reference_sources to authenticated;
grant select on public.questions, public.question_versions, public.question_options, public.question_references, public.question_drugs to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.study_cycles, public.quiz_sessions, public.quiz_session_scopes, public.session_items to authenticated;
grant select, insert on public.answers, public.question_progress to authenticated;
grant select, insert, update on public.review_queue to authenticated;

revoke execute on all functions in schema public from public, anon;
grant execute on function public.start_module_quiz(uuid) to authenticated;
grant execute on function public.start_topic_quiz(uuid) to authenticated;
grant execute on function public.start_drug_quiz(uuid, integer) to authenticated;
grant execute on function public.create_review_session(integer) to authenticated;
grant execute on function public.resume_active_session() to authenticated;
grant execute on function public.get_current_profile() to authenticated;
grant execute on function public.list_modules() to authenticated;
grant execute on function public.list_topics(uuid) to authenticated;
grant execute on function public.list_drugs() to authenticated;
grant execute on function public.search_references(text) to authenticated;
grant execute on function public.get_reference(uuid) to authenticated;
grant execute on function public.get_session_question(uuid, integer) to authenticated;
grant execute on function public.submit_answer(uuid, uuid, public.option_key) to authenticated;
grant execute on function public.start_new_cycle() to authenticated;
grant execute on function public.list_review_queue() to authenticated;
grant execute on function public.get_progress_summary() to authenticated;

create policy profiles_select_own on public.profiles for select to authenticated
using ((select auth.uid()) = user_id or app_private.is_admin());

create policy profiles_insert_own on public.profiles for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy profiles_update_own on public.profiles for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy modules_select on public.modules for select to authenticated using (true);
create policy topics_select on public.topics for select to authenticated using (true);
create policy drugs_select on public.drugs for select to authenticated using (true);
create policy topic_drugs_select on public.topic_drugs for select to authenticated using (true);

create policy reference_entries_select_published on public.reference_entries for select to authenticated
using (status = 'published' or app_private.is_admin());

create policy reference_sources_select_published on public.reference_sources for select to authenticated
using (
  app_private.is_admin()
  or exists (
    select 1 from public.reference_entries re
    where re.id = reference_entry_id and re.status = 'published'
  )
);

create policy questions_select_public on public.questions for select to authenticated
using (
  app_private.is_admin()
  or exists (
    select 1 from public.question_versions qv
    where qv.question_id = id and qv.status = 'published'
  )
);

create policy question_versions_select_published on public.question_versions for select to authenticated
using (status = 'published' or app_private.is_admin());

create policy question_options_select_published on public.question_options for select to authenticated
using (
  app_private.is_admin()
  or exists (
    select 1 from public.question_versions qv
    where qv.id = question_version_id and qv.status = 'published'
  )
);

create policy question_solutions_admin_only on public.question_solutions for all to authenticated
using (app_private.is_admin())
with check (app_private.is_admin());

create policy question_references_select on public.question_references for select to authenticated using (true);
create policy question_drugs_select on public.question_drugs for select to authenticated using (true);

create policy study_cycles_owner on public.study_cycles for all to authenticated
using ((select auth.uid()) = user_id or app_private.is_admin())
with check ((select auth.uid()) = user_id or app_private.is_admin());

create policy quiz_sessions_owner on public.quiz_sessions for all to authenticated
using ((select auth.uid()) = user_id or app_private.is_admin())
with check ((select auth.uid()) = user_id or app_private.is_admin());

create policy quiz_session_scopes_owner on public.quiz_session_scopes for all to authenticated
using (
  app_private.is_admin()
  or exists (
    select 1 from public.quiz_sessions s
    where s.id = session_id and s.user_id = (select auth.uid())
  )
)
with check (
  app_private.is_admin()
  or exists (
    select 1 from public.quiz_sessions s
    where s.id = session_id and s.user_id = (select auth.uid())
  )
);

create policy session_items_owner on public.session_items for all to authenticated
using (
  app_private.is_admin()
  or exists (
    select 1 from public.quiz_sessions s
    where s.id = session_id and s.user_id = (select auth.uid())
  )
)
with check (
  app_private.is_admin()
  or exists (
    select 1 from public.quiz_sessions s
    where s.id = session_id and s.user_id = (select auth.uid())
  )
);

create policy answers_owner on public.answers for select to authenticated
using ((select auth.uid()) = user_id or app_private.is_admin());

create policy question_progress_owner on public.question_progress for all to authenticated
using ((select auth.uid()) = user_id or app_private.is_admin())
with check ((select auth.uid()) = user_id or app_private.is_admin());

create policy review_queue_owner on public.review_queue for all to authenticated
using ((select auth.uid()) = user_id or app_private.is_admin())
with check ((select auth.uid()) = user_id or app_private.is_admin());

create policy import_batches_admin on public.import_batches for all to authenticated
using (app_private.is_admin())
with check (app_private.is_admin());

create policy import_errors_admin on public.import_errors for all to authenticated
using (app_private.is_admin())
with check (app_private.is_admin());

insert into public.modules (code, name, description, sort_order) values
  ('M01', 'Fundamentos de farmacologia', 'Farmacos sinteticos y naturales.', 1),
  ('M02', 'Farmacologia general', 'Farmacocinetica, farmacodinamia y posologia.', 2),
  ('M03', 'Sistema nervioso', 'Farmacos del sistema nervioso periferico, autonomo y central.', 3),
  ('M04', 'Sistema cardiovascular y renal', 'Diureticos, antihipertensivos, insuficiencia cardiaca y antiarritmicos.', 4),
  ('M05', 'Sangre y sistema hematopoyetico', 'Bases fisiologicas, anticoagulantes, coagulantes y farmacos hematopoyeticos.', 5),
  ('M06', 'Sistema endocrino y metabolico', 'Hormonas sexuales, tiroides, diabetes, gota y hueso.', 6),
  ('M07', 'Sistema inmunitario e inflamacion', 'Inflamacion, eicosanoides, AINE, analgesicos y corticoides.', 7),
  ('M08', 'Sistema respiratorio', 'Fisiopatologia respiratoria, antiasmaticos, broncodilatadores, antitusigenos y mucoliticos.', 8),
  ('M09', 'Sistema digestivo', 'Secrecion, motilidad, emeticos y antiemeticos.', 9),
  ('M10', 'Enfermedades infecciosas', 'Terapias antiinfecciosas, antibacterianos, antifungicos, antiparasitarios y antivirales.', 10),
  ('M11', 'Enfermedades neoplasicas', 'Genesis tumoral, quimioterapia combinada y agentes antineoplasicos.', 11)
on conflict (code) do nothing;

insert into public.topics (module_id, code, name, sort_order)
select id, code || '-T01', 'Tema inicial pendiente de importacion', 1
from public.modules
on conflict (code) do nothing;
