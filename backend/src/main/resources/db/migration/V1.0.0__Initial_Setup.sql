-- noinspection SqlNoDataSourceInspectionForFile

CREATE TABLE user
(
	id   VARCHAR(255) NOT NULL,
	name VARCHAR(255) NOT NULL,
	picture_url VARCHAR(255),
	CONSTRAINT PK_USER PRIMARY KEY (id)
);

CREATE TABLE vault
(
	id         VARCHAR(255) NOT NULL,
	user_id    VARCHAR(255) NOT NULL,
	name       VARCHAR(255) NOT NULL,
	salt       VARCHAR(255) NOT NULL,
	iterations VARCHAR(255) NOT NULL,
	masterkey  VARCHAR(255) NOT NULL,
	CONSTRAINT PK_VAULT PRIMARY KEY (id),
	CONSTRAINT FK_VAULT_ON_USER FOREIGN KEY (user_id) REFERENCES user (id)
);

CREATE TABLE vault_user
(
	vault_id  VARCHAR(255) NOT NULL,
	user_id   VARCHAR(255) NOT NULL,
	CONSTRAINT PK_VAULT_USER PRIMARY KEY (vault_id, user_id),
	CONSTRAINT FK_VAULT_USER_ON_VAULT FOREIGN KEY (vault_id) REFERENCES vault (id) ON DELETE CASCADE,
	CONSTRAINT FK_VAULT_USER_ON_USER FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE
);

CREATE TABLE device
(
	id        VARCHAR(255) NOT NULL,
	user_id   VARCHAR(255) NOT NULL,
	name      VARCHAR(255) NOT NULL,
	publickey VARCHAR(255) NOT NULL,
	CONSTRAINT PK_DEVICE PRIMARY KEY (id),
	CONSTRAINT FK_DEVICE_ON_USER FOREIGN KEY (user_id) REFERENCES user (id)
);

CREATE TABLE access
(
	device_id     VARCHAR(255) NOT NULL,
	user_id       VARCHAR(255) NOT NULL,
	vault_id      VARCHAR(255) NOT NULL,
	jwe           VARCHAR(2000) NOT NULL UNIQUE,
	CONSTRAINT PK_ACCESS PRIMARY KEY (device_id, user_id, vault_id),
	CONSTRAINT FK_ACCESS_ON_DEVICE FOREIGN KEY (device_id) REFERENCES device (id) ON DELETE CASCADE,
	CONSTRAINT FK_ACCESS_ON_VAULT_USER FOREIGN KEY (vault_id, user_id) REFERENCES vault_user (vault_id, user_id) ON DELETE CASCADE
);