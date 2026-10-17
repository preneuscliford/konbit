# Modération Konbit 509

Règle automatique : quand **3 comptes différents** signalent le même konbit ou la
même réponse, il est masqué (`status = 'hidden'`) en attendant une revue.
L'auteur le voit encore, les autres non.

En attendant une page d'administration, la revue se fait dans
Supabase → projet `konbit` (wnwyohyfjofdegyvjkfb) → SQL Editor.

## Voir ce qui attend une revue

```sql
select r.target_type, r.target_id, count(*) as signalements,
       array_agg(distinct r.reason) as raisons,
       coalesce(k.body, rp.body) as texte, coalesce(k.status, rp.status) as statut
from abuse_reports r
left join konbits k on r.target_type = 'konbit' and k.id = r.target_id
left join konbit_replies rp on r.target_type = 'reply' and rp.id = r.target_id
where r.status = 'open'
group by r.target_type, r.target_id, k.body, rp.body, k.status, rp.status
order by signalements desc;
```

## Rétablir (signalements injustifiés)

```sql
update konbits set status = 'visible' where id = 123;          -- ou konbit_replies
update abuse_reports set status = 'dismissed'
where target_type = 'konbit' and target_id = 123 and status = 'open';
```

## Retirer définitivement

```sql
update konbits set status = 'removed' where id = 123;          -- ou konbit_replies
update abuse_reports set status = 'actioned'
where target_type = 'konbit' and target_id = 123 and status = 'open';
```

## Feature flags

```sql
-- Activer pour les testeurs seulement, puis pour tout le monde
update feature_flags set enabled_for_testers = true where key = 'compose.photo';
update feature_flags set enabled_for_all = true where key = 'compose.photo';

-- Donner le rôle testeur (ou moderator) à un compte
update profiles set role = 'tester' where lower(pseudo) = lower('son_pseudo');
```
