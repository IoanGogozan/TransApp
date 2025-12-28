1. Tabele

1) companies

Reprezintă firma client.

id – PK (integer sau uuid)

name – text (ex: „Vigeland Transport AS”)

org_number – text (opțional)

default_language – text scurt (ex: no, en, ro)

created_at – timestamp

updated_at – timestamp


2) users

Utilizator al aplicației.

id – PK

company_id – FK → companies.id

name – text

email – text, unic în cadrul companiei sau global

password_hash – text

role – text (de ex. admin / driver)

language – text (ex: no, en, poate null = folosește default_language din company)

active – bool (default true)

created_at – timestamp

updated_at – timestamp


3) vehicles

Vehiculele firmei.

id – PK

company_id – FK → companies.id

reg_number – text (ex: „SV 12345”)

name – text (ex: „Volvo 01”)

type – text (van / truck / trailer etc.)

active – bool (default true)

created_at – timestamp

updated_at – timestamp


4) shifts

Turele / orele șoferilor.

id – PK

company_id – FK → companies.id (ca să poți filtra ușor totul pe firmă)

driver_id – FK → users.id

vehicle_id – FK → vehicles.id

start_time – timestamp

end_time – timestamp (poate fi null când tură e în curs)

activity_type – text (ex: driving, other_work, pause, availability, overtime_100 – ce ai în poză)

notes – text (opțional)

created_at – timestamp

updated_at – timestamp


5) checklist_instances

Un checklist

id – PK

company_id – FK → companies.id

vehicle_id – FK → vehicles.id

driver_id – FK → users.id (cine l-a completat)

date – date (doar ziua, fără timp – ex: 2025-12-06)

created_at – timestamp



6) checklist_answers

Răspunsuri la întrebările din checklist.

id – PK

checklist_instance_id – FK → checklist_instances.id

question_key – text (ex: lights, brakes, tires)

answer – text (ex: ok, deviation, not_applicable)

comment – text (opțional)

has_deviation – bool (true dacă e avvik)

photo_url – text (opțional, dacă permiți poze)

7) defects (avvik)

Probleme raportate la o mașină (de obicei din checklist).

id – PK

company_id – FK → companies.id

vehicle_id – FK → vehicles.id

driver_id – FK → users.id (cine a raportat, opțional)

checklist_instance_id – FK → checklist_instances.id (opțional: null dacă avvik-ul a fost creat manual)

title – text scurt (ex: „Stop light not working”)

details – text (explicație)

status – text (open, in_progress, closed)

created_at – timestamp

updated_at – timestamp

closed_at – timestamp (null dacă e încă deschis)

2. Relațiile 

Ce ai scris tu + completări / corecții:

users.company_id -> companies.id

vehicles.company_id -> companies.id

shifts.company_id -> companies.id

shifts.driver_id -> users.id

shifts.vehicle_id -> vehicles.id

checklist_instances.company_id -> companies.id

checklist_instances.vehicle_id -> vehicles.id

checklist_instances.driver_id -> users.id

checklist_answers.checklist_instance_id -> checklist_instances.id

defects.company_id -> companies.id

defects.vehicle_id -> vehicles.id

defects.driver_id -> users.id (opțional, poate fi null)

defects.checklist_instance_id -> checklist_instances.id (opțional, poate fi null)

cd "D:\Coding Apps\TransApp\frontend"
npm install
npm run dev
