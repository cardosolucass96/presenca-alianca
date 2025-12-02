UPDATE user 
SET password_hash = 'pbkdf2:310000:6ae6059948ccb1c130957ad40c4c4150:f7d86519e9133cd1627acf9fb3abfa110fcb1a3a46363dedc77a77fab20a89f3'
WHERE email = 'admin@alianca.com';
