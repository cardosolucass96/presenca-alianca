INSERT INTO user (id, email, username, company_name, password_hash, role, created_at)
VALUES (
    'admin-initial-001',
    'admin@alianca.com',
    'Administrador',
    'Aliança',
    '$argon2id$v=19$m=19456,t=2,p=1$yIzHQS6Z2Zr5rk5ENlJcyQ$qdSE1cQLlAUeewsGqIx+BcJyth6L8mMxgnQRdRgALkM',
    'admin',
    strftime('%s', 'now') * 1000
);
