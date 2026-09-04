-- Expand launch catalog to five bookable psychologists.
-- Public UI exposes verified status only; raw registration numbers stay internal.

INSERT OR IGNORE INTO psychologist (id, display_name, credential_status, bio, expertise, education, publish_status)
VALUES
('daris', 'Rahama Darus Salamah, S.Psi., Psikolog, CHt', 'verified',
 'Proses tumbuh tidak selalu tentang menjadi lebih kuat atau memiliki semua jawaban. Dalam pendampingan, ia berusaha menciptakan ruang yang hangat, aman, dan tidak menghakimi—ruang untuk merasa diterima, didengarkan, dan sedikit lebih lega menjadi diri sendiri.',
 '["Pengembangan diri","Kepercayaan diri dan self-esteem","Pengelolaan emosi","Stres","Relasi interpersonal","Tantangan akademik","Karier dan pekerjaan"]',
 '[{"institution":"Universitas Sebelas Maret","program":"S1 Psikologi","year":"2023"},{"institution":"Universitas Muhammadiyah Malang","program":"Pendidikan Profesi Psikolog","year":"2026"}]', 'published'),
('zahra', 'Zahratussyafiyah, S.Psi., Psikolog', 'verified',
 'Menjadi manusia memang tidak selalu mudah. Ia hadir sebagai rekan perjalanan dan teman berdiskusi dalam ruang yang hangat, terbuka, dan penuh penerimaan, agar cerita yang masih berantakan dapat perlahan terasa lebih jelas.',
 '["Pengelolaan emosi","Kecemasan dan overthinking","Kesepian dan quarter-life crisis","Kepercayaan diri","Relasi interpersonal","Relasi romantis","Akademik","Karier dan pekerjaan"]',
 '[{"institution":"UIN Maulana Malik Ibrahim Malang","program":"S1 Psikologi","year":"2020"},{"institution":"Universitas Muhammadiyah Malang","program":"Pendidikan Profesi Psikolog","year":"2026"}]', 'published'),
('hasanah', 'Raudhatul Hasanah, S.Psi., Psikolog, CHt', 'verified',
 'Psikolog umum yang memiliki minat pada permasalahan individu terkait penerimaan diri, persiapan pra-nikah, dinamika dan komunikasi dengan pasangan, serta relasi orang tua dan anak.',
 '["Penerimaan diri","Persiapan pra-nikah","Dinamika dan komunikasi pasangan","Relasi orang tua dan anak"]',
 '[{"institution":"Universitas Negeri Malang","program":"S1 Psikologi","year":"2006"},{"institution":"Universitas Muhammadiyah Malang","program":"Pendidikan Profesi Psikolog","year":"2026"}]', 'published'),
('chika', 'Kurnia Armachika Maylasari, S.Psi., Psikolog', 'verified',
 'Setiap manusia memiliki perjalanan tumbuh dan luka yang berbeda. Ia berusaha menghadirkan ruang yang hangat, aman, dan kolaboratif agar setiap orang dapat merasa didengar tanpa takut dihakimi.',
 '["Permasalahan anak","Relasi orang tua dan anak","Relasi pertemanan","Parenting","Akademik","Karier dan pekerjaan","Perilaku dan emosi anak","Optimalisasi tumbuh kembang"]',
 '[{"institution":"UIN Sunan Ampel Surabaya","program":"S1 Psikologi","year":"2024"},{"institution":"Universitas Muhammadiyah Malang","program":"Pendidikan Profesi Psikolog","year":"2026"}]', 'published');

INSERT OR IGNORE INTO service (id, program_pillar, display_name, description)
VALUES
('s_pulang_chat', 'pulang', 'SERAYA PULANG — Chat', 'Konseling individu melalui percakapan tertulis.'),
('s_pulang_call', 'pulang', 'SERAYA PULANG — Call', 'Konseling individu melalui panggilan suara atau video.'),
('s_pulang_offline', 'pulang', 'SERAYA PULANG — Tatap Muka', 'Konseling individu secara tatap muka di Havana Park, Malang.');

-- Keep the original Fuja offerings and add the canonical three-service shape.
INSERT OR IGNORE INTO service_offering (id, service_id, psychologist_id, mode, duration_minutes, transition_buffer_min, audience, active)
SELECT 'off_' || p.id || '_chat', 's_pulang_chat', p.id, 'online', 60, 15, 'individual', 1 FROM psychologist p WHERE p.id IN ('fuja','daris','zahra','hasanah','chika');
INSERT OR IGNORE INTO service_offering (id, service_id, psychologist_id, mode, duration_minutes, transition_buffer_min, audience, active)
SELECT 'off_' || p.id || '_call', 's_pulang_call', p.id, 'online', 60, 15, 'individual', 1 FROM psychologist p WHERE p.id IN ('fuja','daris','zahra','hasanah','chika');
INSERT OR IGNORE INTO service_offering (id, service_id, psychologist_id, mode, duration_minutes, transition_buffer_min, audience, active)
SELECT 'off_' || p.id || '_offline', 's_pulang_offline', p.id, 'offline', 60, 15, 'individual', 1 FROM psychologist p WHERE p.id IN ('fuja','daris','zahra','hasanah','chika');

INSERT OR IGNORE INTO service_offering_revision (id, offering_id, version, price_idr, duration_minutes, transition_buffer_min, policy_version)
SELECT 'rev_' || so.id || '_v1', so.id, 1,
 CASE so.mode WHEN 'offline' THEN 200000 WHEN 'online' AND so.service_id = 's_pulang_chat' THEN 99000 ELSE 125000 END,
 60, 15, 'v1-2026-09-04'
FROM service_offering so WHERE so.id LIKE 'off_%';

INSERT OR IGNORE INTO availability_rule (id, psychologist_id, weekday, starts_at_local, ends_at_local, effective_from) VALUES
('rule_fuja_0','fuja',0,'09:00','20:00','2026-01-01'),('rule_fuja_1','fuja',1,'09:00','20:00','2026-01-01'),('rule_fuja_2','fuja',2,'09:00','20:00','2026-01-01'),('rule_fuja_3','fuja',3,'09:00','20:00','2026-01-01'),('rule_fuja_4','fuja',4,'09:00','20:00','2026-01-01'),('rule_fuja_5','fuja',5,'09:00','20:00','2026-01-01'),('rule_fuja_6','fuja',6,'09:00','20:00','2026-01-01'),
('rule_daris_0','daris',0,'09:00','20:00','2026-01-01'),('rule_daris_1','daris',1,'09:00','20:00','2026-01-01'),('rule_daris_2','daris',2,'09:00','20:00','2026-01-01'),('rule_daris_3','daris',3,'09:00','20:00','2026-01-01'),('rule_daris_4','daris',4,'09:00','20:00','2026-01-01'),('rule_daris_5','daris',5,'09:00','20:00','2026-01-01'),('rule_daris_6','daris',6,'09:00','20:00','2026-01-01'),
('rule_zahra_0','zahra',0,'09:00','20:00','2026-01-01'),('rule_zahra_1','zahra',1,'09:00','20:00','2026-01-01'),('rule_zahra_2','zahra',2,'09:00','20:00','2026-01-01'),('rule_zahra_3','zahra',3,'09:00','20:00','2026-01-01'),('rule_zahra_4','zahra',4,'09:00','20:00','2026-01-01'),('rule_zahra_5','zahra',5,'09:00','20:00','2026-01-01'),('rule_zahra_6','zahra',6,'09:00','20:00','2026-01-01'),
('rule_hasanah_0','hasanah',0,'09:00','20:00','2026-01-01'),('rule_hasanah_1','hasanah',1,'09:00','20:00','2026-01-01'),('rule_hasanah_2','hasanah',2,'09:00','20:00','2026-01-01'),('rule_hasanah_3','hasanah',3,'09:00','20:00','2026-01-01'),('rule_hasanah_4','hasanah',4,'09:00','20:00','2026-01-01'),('rule_hasanah_5','hasanah',5,'09:00','20:00','2026-01-01'),('rule_hasanah_6','hasanah',6,'09:00','20:00','2026-01-01'),
('rule_chika_0','chika',0,'09:00','20:00','2026-01-01'),('rule_chika_1','chika',1,'09:00','20:00','2026-01-01'),('rule_chika_2','chika',2,'09:00','20:00','2026-01-01'),('rule_chika_3','chika',3,'09:00','20:00','2026-01-01'),('rule_chika_4','chika',4,'09:00','20:00','2026-01-01'),('rule_chika_5','chika',5,'09:00','20:00','2026-01-01'),('rule_chika_6','chika',6,'09:00','20:00','2026-01-01');

UPDATE psychologist SET publish_status = 'published' WHERE id IN ('fuja','daris','zahra','hasanah','chika');
