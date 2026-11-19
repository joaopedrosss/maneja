-- Maneja · esquema do PostgreSQL (SPEC-008). Idempotente: pode rodar a cada subida.

CREATE TABLE IF NOT EXISTS fazenda (
    id        text PRIMARY KEY,
    nome      text NOT NULL,
    timezone  text NOT NULL
);

CREATE TABLE IF NOT EXISTS piquete (
    id          text PRIMARY KEY,
    fazenda_id  text NOT NULL REFERENCES fazenda(id),
    nome        text NOT NULL,
    geometria   jsonb NOT NULL,
    area_ha     double precision NOT NULL,
    vegetacao   text NOT NULL DEFAULT '',
    externo_id  text,
    ordem       integer NOT NULL
);

CREATE TABLE IF NOT EXISTS lotacao (
    piquete_id  text PRIMARY KEY REFERENCES piquete(id) ON DELETE CASCADE,
    fazenda_id  text NOT NULL,
    bois        integer NOT NULL CHECK (bois >= 0),
    vacas       integer NOT NULL CHECK (vacas >= 0),
    bezerros    integer NOT NULL CHECK (bezerros >= 0),
    desde       date
);

CREATE TABLE IF NOT EXISTS leitura_ndvi (
    piquete_id  text NOT NULL REFERENCES piquete(id) ON DELETE CASCADE,
    data        date NOT NULL,
    valor       double precision NOT NULL,
    PRIMARY KEY (piquete_id, data)
);

-- histórico de movimentações (mais recente = ordem 0); o JSON tem os campos de src/lib/tipos.ts
CREATE TABLE IF NOT EXISTS movimentacao (
    id     text PRIMARY KEY,
    ordem  integer NOT NULL,
    dados  jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS plano_atual (
    unico  boolean PRIMARY KEY DEFAULT true CHECK (unico),
    dados  jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS coleira (
    id                   text PRIMARY KEY,
    categoria            text NOT NULL,
    piquete_cadastro_id  text NOT NULL,
    piquete_fisico_id    text NOT NULL,  -- onde o simulador diz que o animal está de fato
    ordem                integer NOT NULL
);

CREATE TABLE IF NOT EXISTS posicao (
    id         bigserial PRIMARY KEY,
    coleira_id text NOT NULL,
    instante   timestamptz NOT NULL,
    lat        double precision NOT NULL,
    lon        double precision NOT NULL
);
CREATE INDEX IF NOT EXISTS posicao_instante ON posicao (instante);

CREATE TABLE IF NOT EXISTS grupo_externo (
    externo_id  text PRIMARY KEY,
    coleiras    jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS parametro (
    chave  text PRIMARY KEY,
    valor  text NOT NULL
);
